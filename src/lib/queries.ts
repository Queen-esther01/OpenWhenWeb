import { useMutation, useQuery } from "@tanstack/react-query";
import { api, getApiError } from "./api";

// ─── TTS ────────────────────────────────────────────────────────────────────

type TtsInput = {
  text: string;
  voiceId: string;
  modelId?: string;
};

type TtsOutput = {
  audioBlob: Blob;
  characterCost: string | null;
};

type SaveLetterDraftInput = {
  accessToken: string;
  draftId?: string | null;
  title: string;
  content: string;
  opensAt: string | null;
  isLocked: boolean;
  categoryId: string;
  soundId: string;
  voiceId: string;
};

type SaveLetterDraftOutput = {
  draftId: string;
  status: "draft";
};

export function useTts() {
  return useMutation({
    mutationFn: async ({ text, voiceId, modelId }: TtsInput): Promise<TtsOutput> => {
      const response = await api.post("/api/tts", {
        text,
        voiceId,
        modelId: modelId ?? "eleven_flash_v2_5",
      }, {
        responseType: "blob",
      });

      const characterCost = response.headers["character-cost"] ?? null;
      return { audioBlob: response.data as Blob, characterCost };
    },
  });
}

export function useSaveLetterDraft() {
  return useMutation({
    mutationFn: async (input: SaveLetterDraftInput): Promise<SaveLetterDraftOutput> => {
      const response = await api.post("/api/save-letter-draft", input);
      return response.data as SaveLetterDraftOutput;
    },
    onError: (error) => {
      return getApiError(error);
    },
  });
}

// ─── Invite Partner ─────────────────────────────────────────────────────────

type InvitePartnerInput = {
  partnerEmail: string;
  partnerName: string | null;
  senderName: string;
};

export function useInvitePartner() {
  return useMutation({
    mutationFn: async (input: InvitePartnerInput) => {
      const response = await api.post("/api/invite-partner", input);
      return response.data;
    },
    onError: (error) => {
      return getApiError(error);
    },
  });
}