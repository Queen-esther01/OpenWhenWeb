import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SendLetterResponse =
  | {
      success: true;
      letterId: string;
      status: "sent";
    }
  | {
      error: string;
    };

const resendApiKey = process.env.RESEND_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function getRequestBody(req: NextApiRequest) {
  const {
    accessToken,
    draftId,
    title,
    content,
    opensAt,
    isLocked,
    categoryId,
    soundId,
    voiceId,
    recipientEmail,
    recipientName,
  } = req.body ?? {};

  return {
    accessToken: typeof accessToken === "string" ? accessToken.trim() : "",
    draftId: typeof draftId === "string" && draftId.trim() ? draftId.trim() : null,
    title: typeof title === "string" ? title.trim() : "",
    content: typeof content === "string" ? content.trim() : "",
    opensAt: typeof opensAt === "string" && opensAt.trim() ? opensAt.trim() : null,
    isLocked: Boolean(isLocked),
    categoryId: typeof categoryId === "string" ? categoryId.trim() : "",
    soundId: typeof soundId === "string" ? soundId.trim() : "",
    voiceId: typeof voiceId === "string" ? voiceId.trim() : "",
    recipientEmail: typeof recipientEmail === "string" ? recipientEmail.trim().toLowerCase() : "",
    recipientName: typeof recipientName === "string" ? recipientName.trim() : "",
  };
}

async function resolveRecipientId(supabase: SupabaseClient<any, any, any, any, any>, email: string) {
  const authAdmin = supabase.auth.admin as unknown as {
    listUsers: (params?: { page?: number; perPage?: number }) => Promise<{ data?: { users?: Array<{ id: string; email?: string | null }> } }>;
  };

  const { data } = await authAdmin.listUsers({ page: 1, perPage: 1000 });
  const users = data?.users ?? [];

  return users.find((user) => user.email?.toLowerCase() === email)?.id ?? null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendLetterResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!resendApiKey || !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing configuration." });
  }

  const body = getRequestBody(req);

  if (!body.accessToken) {
    return res.status(401).json({ error: "You need to be signed in to send a note." });
  }

  if (!body.title || !body.content || !body.categoryId || !body.soundId || !body.voiceId) {
    return res.status(400).json({ error: "Missing note details." });
  }

  if (!body.recipientEmail) {
    return res.status(400).json({ error: "A recipient email is required." });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userResult, error: userError } = await authClient.auth.getUser(body.accessToken);

  if (userError || !userResult.user) {
    return res.status(401).json({ error: "Your session is no longer valid. Please sign in again." });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const recipientId = await resolveRecipientId(supabase, body.recipientEmail);

  if (!recipientId) {
    return res.status(400).json({ error: "We could not find your recipient yet." });
  }

  const notePayload = {
    sender_id: userResult.user.id,
    recipient_id: recipientId,
    title: body.title,
    content: body.content,
    opens_at: body.isLocked && body.opensAt ? body.opensAt : null,
    is_locked: body.isLocked,
    status: "sent" as const,
    category_id: body.categoryId,
    sound_id: body.soundId,
    voice_id: body.voiceId,
  };

  let letterId = body.draftId ?? "";

  if (body.draftId) {
    const { data: existingLetter, error: existingLetterError } = await supabase
      .from("open_when_letters")
      .select("id")
      .eq("id", body.draftId)
      .eq("sender_id", userResult.user.id)
      .eq("status", "draft")
      .maybeSingle();

    if (existingLetterError) {
      return res.status(500).json({ error: existingLetterError.message });
    }

    if (existingLetter) {
      const { error: updateError } = await supabase
        .from("open_when_letters")
        .update(notePayload)
        .eq("id", body.draftId)
        .eq("sender_id", userResult.user.id);

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      letterId = body.draftId;
    } else {
      const { data: insertedLetter, error: insertError } = await supabase
        .from("open_when_letters")
        .insert(notePayload)
        .select("id")
        .single();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }

      letterId = insertedLetter.id;
    }
  } else {
    const { data: insertedLetter, error: insertError } = await supabase
      .from("open_when_letters")
      .insert(notePayload)
      .select("id")
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    letterId = insertedLetter.id;
  }

  const openLink = `${siteUrl}/letter/${letterId}`;
  const recipientDisplayName = body.recipientName || body.recipientEmail.split("@")[0] || "there";
  const readyAtText = body.isLocked && body.opensAt ? new Date(body.opensAt).toLocaleString() : null;

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "OpenWhen <onboarding@cuetoon.com>",
      to: [body.recipientEmail],
      subject: `You have a new OpenWhen letter`,
      html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New OpenWhen letter</title>
  </head>
  <body style="margin:0;padding:0;background-color:#FFFFFF;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FFFFFF;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#FFFFFF;border-radius:16px;border:1px solid rgba(238,195,210,0.6);overflow:hidden;box-shadow:0 8px 24px rgba(128,63,89,0.08);">
            <tr>
              <td style="padding:36px 28px 8px;text-align:center;background:linear-gradient(180deg,rgba(255,237,240,0.7) 0%,#FFFFFF 100%);">
                <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a3554;font-family:Helvetica,Arial,sans-serif;">
                  OpenWhen
                </p>
                <h1 style="margin:0;font-size:26px;line-height:1.3;color:#5f2f43;font-weight:700;font-family:Georgia,'Times New Roman',serif;">
                  A letter is waiting for you, ${recipientDisplayName}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 32px;text-align:center;">
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#7f465b;font-family:Helvetica,Arial,sans-serif;">
                  Someone you’re connected with sent you an OpenWhen note.
                  ${readyAtText ? `It will be ready to open on <strong>${readyAtText}</strong>.` : ""}
                </p>

                <a
                  href="${openLink}"
                  style="display:inline-block;padding:14px 32px;border-radius:9999px;background-color:#8b3a57;color:#fff6fb;font-size:15px;font-weight:700;text-decoration:none;font-family:Helvetica,Arial,sans-serif;"
                >
                  Open your letter
                </a>

                <p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#936273;font-family:Helvetica,Arial,sans-serif;">
                  This email does not include the contents of the note.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-size:12px;color:#b08d99;font-family:Helvetica,Arial,sans-serif;">
            Letters that wait for the perfect moment
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    return res.status(500).json({ error: message });
  }

  return res.status(200).json({ success: true, letterId, status: "sent" });
}