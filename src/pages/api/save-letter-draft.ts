import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type SaveLetterDraftResponse =
  | {
      success: true;
      draftId: string;
      status: "draft";
    }
  | {
      error: string;
    };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SaveLetterDraftResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase configuration." });
  }

  const body = getRequestBody(req);

  if (!body.accessToken) {
    return res.status(401).json({ error: "You need to be signed in to save a draft." });
  }

  if (!body.title || !body.content || !body.categoryId || !body.soundId || !body.voiceId) {
    return res.status(400).json({ error: "Missing draft details." });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userResult, error: userError } = await authClient.auth.getUser(body.accessToken);

  if (userError || !userResult.user) {
    return res.status(401).json({ error: "Your session is no longer valid. Please sign in again." });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const draftPayload = {
    sender_id: userResult.user.id,
    title: body.title,
    content: body.content,
    opens_at: body.isLocked && body.opensAt ? body.opensAt : null,
    is_locked: body.isLocked,
    status: "draft" as const,
    category_id: body.categoryId,
    sound_id: body.soundId,
    voice_id: body.voiceId,
  };

  if (body.draftId) {
    const { data: existingDraft, error: existingDraftError } = await supabase
      .from("open_when_letters")
      .select("id")
      .eq("id", body.draftId)
      .eq("sender_id", userResult.user.id)
      .eq("status", "draft")
      .maybeSingle();

    if (existingDraftError) {
      return res.status(500).json({ error: existingDraftError.message });
    }

    if (existingDraft) {
      const { error: updateError } = await supabase
        .from("open_when_letters")
        .update(draftPayload)
        .eq("id", body.draftId)
        .eq("sender_id", userResult.user.id);

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      return res.status(200).json({ success: true, draftId: body.draftId, status: "draft" });
    }

    return res.status(404).json({ error: "Draft not found." });
  }

  const { data: insertedDraft, error: insertError } = await supabase
    .from("open_when_letters")
    .insert(draftPayload)
    .select("id")
    .single();

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  return res.status(200).json({ success: true, draftId: insertedDraft.id, status: "draft" });
}