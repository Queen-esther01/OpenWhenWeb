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

type SendLetterInput = {
  accessToken: string;
  draftId?: string | null;
  title: string;
  content: string;
  opensAt: string | null;
  isLocked: boolean;
  categoryId: string;
  soundId: string;
  voiceId: string;
  recipientEmail?: string | null;
  recipientName?: string | null;
};

type SendLetterOutput = {
  success: true;
  letterId: string;
  status: "sent";
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

export function useSendLetter() {
  return useMutation({
    mutationFn: async (input: SendLetterInput): Promise<SendLetterOutput> => {
      const response = await api.post("/api/send-letter", input);
      return response.data as SendLetterOutput;
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

type InviteDetailsInput = {
  invitedBy: string;
  partnerEmail: string;
};

type InviteDetailsOutput = {
  success: true;
  inviterEmail: string | null;
  inviterName: string;
  partnerEmail: string;
  status: string;
};

type AcceptInviteInput = {
  email: string;
};

type AcceptInviteOutput = {
  success: true;
  accepted: boolean;
};

type PartnerOnboardedInput = {
  partnerEmail: string;
};

type PartnerOnboardedOutput = {
  success: true;
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

export function useInviteDetails() {
  return useMutation({
    mutationFn: async (input: InviteDetailsInput): Promise<InviteDetailsOutput> => {
      const response = await api.post("/api/invite-details", input);
      return response.data as InviteDetailsOutput;
    },
    onError: (error) => {
      return getApiError(error);
    },
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: async (input: AcceptInviteInput): Promise<AcceptInviteOutput> => {
      const response = await api.post("/api/accept-invite", input);
      return response.data as AcceptInviteOutput;
    },
    onError: (error) => {
      return getApiError(error);
    },
  });
}

export function usePartnerOnboarded() {
  return useMutation({
    mutationFn: async (input: PartnerOnboardedInput): Promise<PartnerOnboardedOutput> => {
      const response = await api.post("/api/partner-onboarded", input);
      return response.data as PartnerOnboardedOutput;
    },
    onError: (error) => {
      return getApiError(error);
    },
  });
}