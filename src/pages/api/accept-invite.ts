import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase configuration." });
  }

  const { email } = req.body ?? {};

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required." });
  }

  // Use service role to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: acceptedInvites, error } = await supabase
    .from("partner_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("partner_email", email.toLowerCase())
    .eq("status", "pending")
    .select("id");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    success: true,
    accepted: Array.isArray(acceptedInvites) && acceptedInvites.length > 0,
  });
}