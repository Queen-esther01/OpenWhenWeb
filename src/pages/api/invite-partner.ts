import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

type InviteResponse = {
  success?: boolean;
  error?: string;
};

const resendApiKey = process.env.RESEND_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InviteResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!resendApiKey) {
    return res.status(500).json({
      error: "Missing RESEND_API_KEY environment variable.",
    });
  }

  const { partnerEmail, partnerName, senderName } = req.body ?? {};

  if (!partnerEmail || typeof partnerEmail !== "string") {
    return res.status(400).json({ error: "`partnerEmail` is required." });
  }

  const normalizedEmail = partnerEmail.trim().toLowerCase();
  const displayName = partnerName?.trim() || "there";
  const senderDisplay = senderName?.trim() || "Your partner";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const inviteUrl = `${siteUrl}/join?email=${encodeURIComponent(normalizedEmail)}`;

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: "OpenWhen <onboarding@cuetoon.com>",
      to: [normalizedEmail],
      subject: `${senderDisplay} invited you to OpenWhen`,
      html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>You're invited to OpenWhen</title>
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
                  You're invited, ${displayName}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 32px;text-align:center;">
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#7f465b;font-family:Helvetica,Arial,sans-serif;">
                  <strong style="color:#5f2f43;">${senderDisplay}</strong> wants to share love letters with you on OpenWhen — a space for messages that wait for the perfect moment.
                </p>

                <a
                  href="${inviteUrl}"
                  style="display:inline-block;padding:14px 32px;border-radius:9999px;background-color:#8b3a57;color:#fff6fb;font-size:15px;font-weight:700;text-decoration:none;font-family:Helvetica,Arial,sans-serif;"
                >
                  Accept invitation
                </a>

                <p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#936273;font-family:Helvetica,Arial,sans-serif;">
                  If you weren't expecting this, you can safely ignore this email.
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

    return res.status(200).json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send invitation.";
    return res.status(500).json({ error: message });
  }
}