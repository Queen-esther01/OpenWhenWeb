import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type InviteDetailsResponse =
  | {
      success: true;
      inviterEmail: string | null;
      inviterName: string;
      partnerEmail: string;
      status: string;
    }
  | {
      error: string;
    };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InviteDetailsResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase configuration." });
  }

  const { invitedBy, partnerEmail } = req.body ?? {};

  if (!invitedBy || typeof invitedBy !== "string" || !partnerEmail || typeof partnerEmail !== "string") {
    return res.status(400).json({ error: "invitedBy and partnerEmail are required." });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: invite, error } = await supabase
    .from("partner_invites")
    .select("invited_by, partner_email, partner_name, status")
    .eq("invited_by", invitedBy)
    .eq("partner_email", partnerEmail.toLowerCase())
    .in("status", ["accepted", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!invite) {
    return res.status(200).json({
      success: true,
      inviterEmail: null,
      inviterName: "Your partner",
      partnerEmail: partnerEmail.toLowerCase(),
      status: "pending",
    });
  }

  const [{ data: inviterProfile }, { data: inviterAuth }] = await Promise.all([
    supabase.from("profiles").select("username, display_name").eq("id", invite.invited_by).single(),
    supabase.auth.admin.getUserById(invite.invited_by),
  ]);

  return res.status(200).json({
    success: true,
    inviterEmail: inviterAuth?.user?.email ?? null,
    inviterName:
      inviterProfile?.display_name ?? inviterProfile?.username ?? invite.partner_name ?? "Your partner",
    partnerEmail: invite.partner_email,
    status: invite.status,
  });
}