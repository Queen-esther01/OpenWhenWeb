import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type ReadyLetterReminderResponse =
  | {
      success: true;
      processed: number;
      sent: number;
      results: Array<{ letterId: string; sent: boolean; error?: string }>;
    }
  | {
      error: string;
    };

type OpenWhenLetter = {
  id: string;
  recipient_id: string | null;
  title: string;
  opens_at: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const jobSecret = process.env.READY_LETTER_JOB_SECRET;

function buildEmailHtml(recipientName: string, readyLink: string, readyTime: string | null) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your OpenWhen letter is ready</title>
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
                  Your letter is ready, ${recipientName}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 32px;text-align:center;">
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#7f465b;font-family:Helvetica,Arial,sans-serif;">
                  A locked letter is now ready to open.
                  ${readyTime ? `It became available at <strong>${readyTime}</strong>.` : ""}
                </p>

                <a
                  href="${readyLink}"
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
</html>`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReadyLetterReminderResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
    return res.status(500).json({ error: "Missing configuration." });
  }

  if (jobSecret) {
    const suppliedSecret = req.headers["x-job-secret"];
    if (typeof suppliedSecret !== "string" || suppliedSecret !== jobSecret) {
      return res.status(401).json({ error: "Unauthorized." });
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = new Resend(resendApiKey);
  const nowIso = new Date().toISOString();

  const { data: readyLetters, error: fetchError } = await supabase
    .from("open_when_letters")
    .select("id, recipient_id, title, opens_at")
    .eq("status", "sent")
    .eq("is_locked", true)
    .lte("opens_at", nowIso)
    .is("ready_email_sent_at", null)
    .not("recipient_id", "is", null);

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }

  const letters = (readyLetters ?? []) as OpenWhenLetter[];
  const results: Array<{ letterId: string; sent: boolean; error?: string }> = [];

  for (const letter of letters) {
    if (!letter.recipient_id) {
      results.push({ letterId: letter.id, sent: false, error: "Missing recipient." });
      continue;
    }

    const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(letter.recipient_id);

    if (userError || !userResult.user?.email) {
      results.push({ letterId: letter.id, sent: false, error: userError?.message ?? "Recipient email unavailable." });
      continue;
    }

    const recipientEmail = userResult.user.email.toLowerCase();
    const recipientName = userResult.user.user_metadata?.full_name?.trim() || userResult.user.email.split("@")[0] || "there";
    const readyLink = `${siteUrl}/letter/${letter.id}`;

    try {
      await resend.emails.send({
        from: "OpenWhen <onboarding@cuetoon.com>",
        to: [recipientEmail],
        subject: "Your OpenWhen letter is ready",
        html: buildEmailHtml(recipientName, readyLink, letter.opens_at ? new Date(letter.opens_at).toLocaleString() : null),
      });

      const { error: updateError } = await supabase
        .from("open_when_letters")
        .update({ ready_email_sent_at: nowIso })
        .eq("id", letter.id)
        .is("ready_email_sent_at", null);

      if (updateError) {
        results.push({ letterId: letter.id, sent: false, error: updateError.message });
        continue;
      }

      results.push({ letterId: letter.id, sent: true });
    } catch (error) {
      results.push({ letterId: letter.id, sent: false, error: error instanceof Error ? error.message : "Failed to send email." });
    }
  }

  return res.status(200).json({
    success: true,
    processed: results.length,
    sent: results.filter((item) => item.sent).length,
    results,
  });
}