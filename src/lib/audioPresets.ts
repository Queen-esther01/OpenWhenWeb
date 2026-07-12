export type SoundPreset = {
  id: string;
  label: string;
  helper: string;
  previewAudioUrl: string;
};

export type VoicePreset = {
  id: string;
  label: string;
  helper: string;
  previewVoiceId: string;
  previewVoiceUrl: string;
};

export const ambientPreviewVolume = 0.1;
export const voicePreviewVolume = 0.85;

export const previewAudioUrl =
  "https://res.cloudinary.com/tinkerbell/video/upload/v1783687887/mickeyscat-calm-piano-mickeyscat-147764_jf7q1r.mp3";
export const previewVoiceId = "ynFh2KFGO14BryP8q1rh";
export const previewVoiceUrl =
  "https://res.cloudinary.com/tinkerbell/video/upload/v1783886590/Durty_D_-_calm_relaxing_romantic_pvc_s50_m2_beemmr.mp3";

export const soundPresets: SoundPreset[] = [
  {
    id: "calm-piano",
    label: "Calm Piano",
    helper: "Soft and reflective.",
    previewAudioUrl,
  },
  {
    id: "soft-rain",
    label: "Soft Rain",
    helper: "Gentle and atmospheric.",
    previewAudioUrl,
  },
  {
    id: "evening-strings",
    label: "Evening Strings",
    helper: "Warm and cinematic.",
    previewAudioUrl,
  },
  {
    id: "midnight-ambient",
    label: "Midnight Ambient",
    helper: "Low, intimate, and still.",
    previewAudioUrl,
  },
];

export const voicePresets: VoicePreset[] = [
  {
    id: "soft-warmth",
    label: "Soft Warmth",
    helper: "Tender and grounding.",
    previewVoiceId,
    previewVoiceUrl,
  },
  {
    id: "gentle-confident",
    label: "Gentle Confident",
    helper: "Clear, kind, reassuring.",
    previewVoiceId,
    previewVoiceUrl,
  },
  {
    id: "romantic-whisper",
    label: "Romantic Whisper",
    helper: "Closer, softer, more private.",
    previewVoiceId,
    previewVoiceUrl,
  },
  {
    id: "steady-companion",
    label: "Steady Companion",
    helper: "Calm and always present.",
    previewVoiceId,
    previewVoiceUrl,
  },
];