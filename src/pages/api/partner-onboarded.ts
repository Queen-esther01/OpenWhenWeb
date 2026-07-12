import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resendApiKey = process.env.RESEND_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing configuration." });
  }

  const { partnerEmail } = req.body ?? {};

  if (!partnerEmail || typeof partnerEmail !== "string") {
    return res.status(400).json({ error: "partnerEmail is required." });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Find the inviter
  const { data: invite } = await supabase
    .from("partner_invites")
    .select("invited_by, partner_name")
    .eq("partner_email", partnerEmail.toLowerCase())
    .eq("status", "accepted")
    .single();

  if (!invite) {
    return res.status(200).json({ success: true }); // No invite found, nothing to do
  }

  // Get inviter's email
  const { data: inviter } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", invite.invited_by)
    .single();

  const inviterName = inviter?.username ?? "Your partner";
  const partnerName = invite.partner_name ?? partnerEmail.split("@")[0] ?? "Your partner";

  const resend = new Resend(resendApiKey);

  try {
    // Get inviter's email from auth.users
    const { data: inviterAuth } = await supabase.auth.admin.getUserById(invite.invited_by);
    const inviterEmail = inviterAuth?.user?.email;

    if (inviterEmail) {
      await resend.emails.send({
        from: "OpenWhen <onboarding@cuetoon.com>",
        to: [inviterEmail],
        subject: `${partnerName} joined OpenWhen`,
        html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Your partner joined</title>
  </head>
  <body style="margin:0;padding:0;background-color:#FFFFFF;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FFFFFF;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#FFFFFF;border-radius:16px;border:1px solid rgba(238,195,210,0.6);">
            <tr>
              <td style="padding:36px 28px 8px;text-align:center;background:linear-gradient(180deg,rgba(255,237,240,0.7) 0%,#FFFFFF 100%);">
                <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a3554;font-family:Helvetica,Arial,sans-serif;">
                  OpenWhen
                </p>
                <h1 style="margin:0;font-size:26px;line-height:1.3;color:#5f2f43;font-weight:700;font-family:Georgia,'Times New Roman',serif;">
                  ${partnerName} is here
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 32px;text-align:center;">
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#7f465b;font-family:Helvetica,Arial,sans-serif;">
                  <strong style="color:#5f2f43;">${partnerName}</strong> has accepted your invitation and joined OpenWhen.
                  You can now send each other love letters.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    return res.status(500).json({ error: message });
  }
}