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
  gender?: "male" | "female";
  previewVoiceId: string;
  previewVoiceUrl: string;
};

export const ambientPreviewVolume = 0.2;
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
    previewAudioUrl: "https://res.cloudinary.com/tinkerbell/video/upload/v1783900498/konstantinpazuzustudio-solitude-piano-and-rain-482759_osrkwc.mp3",
  },
  {
    id: "ocean-waves",
    label: "Ocean Waves",
    helper: "Calm and soothing.",
    previewAudioUrl: "https://res.cloudinary.com/tinkerbell/video/upload/v1783900220/ocean-piano-waves-part-4-510370_mmm6la.mp3",
  },
  {
    id: "sad-piano",
    label: "Sad Piano",
    helper: "Melancholic and introspective.",
    previewAudioUrl: "https://res.cloudinary.com/tinkerbell/video/upload/v1783900385/leberch-sorrow-piano-248015_clj4tn.mp3",
  },
  {
    id: "midnight-ambient",
    label: "Midnight Ambient",
    helper: "Low, intimate, and still.",
    previewAudioUrl: "https://res.cloudinary.com/tinkerbell/video/upload/v1783899967/konstantinpazuzustudio-piano-for-sleep-491000_nktdpn.mp3",
  },
];

export const voicePresets: VoicePreset[] = [
    {
    id: "romantic-whisper",
    gender: "male",
    label: "Romantic Whisper",
    helper: "Closer, softer, more private.",
    previewVoiceId,
    previewVoiceUrl,
  },
  {
    id: "velvet-lark",
    gender: "female",
    label: "Velvet Lark",
    helper: "Bright, feminine, and gentle.",
    previewVoiceId: "YgzytRZyVmEux6PCtJYB",
    previewVoiceUrl: "https://res.cloudinary.com/tinkerbell/video/upload/v1783902605/ElevenLabs_2026-07-13T00_29_15_Ivanna_-_Sultry_Fun_and_Captivating_pvc_s50_m2_dlfw2k.mp3",
  },
  {
    id: "gentle-confident",
    gender: "male",
    label: "Gentle Confident",
    helper: "Clear, kind, reassuring.",
    previewVoiceId: "QF9HJC7XWnue5c9W3LkY",
    previewVoiceUrl: "https://res.cloudinary.com/tinkerbell/video/upload/v1783901457/ElevenLabs_2026-07-13T00_10_15_Joseff_Sweet_-_Comfort_and_Warmth_pvc_s50_m2_tbxld8.mp3",
  },
  {
    id: "rose-echo",
    gender: "female",
    label: "Rose Echo",
    helper: "Soft and intimate.",
    previewVoiceId: "7AvtJrjTNyBhBxEvNPIZ",
    previewVoiceUrl: "https://res.cloudinary.com/tinkerbell/video/upload/v1783902154/ElevenLabs_2026-07-13T00_21_34_Rhythm_-_Calm_Friendly_Meditation_pvc_s50_m2_tjfkf2.mp3",
  },
  {
    id: "soft-warmth",
    gender: "male",
    label: "Soft Warmth",
    helper: "Tender and grounding.",
    previewVoiceId: "KH1SQLVulwP6uG4O3nmT",
    previewVoiceUrl: "https://res.cloudinary.com/tinkerbell/video/upload/v1783903258/ElevenLabs_2026-07-13T00_40_30_Brad_-_Romantic_Gentle_pvc_s50_m2_rp9cvo.mp3",
  },
  {
    id: "steady-companion",
    gender: "male",
    label: "Steady Companion",
    helper: "Calm and always present.",
    previewVoiceId: "ouFAjcjtdrVBT9bRFhFQ",
    previewVoiceUrl: "https://res.cloudinary.com/tinkerbell/video/upload/v1783901629/ElevenLabs_2026-07-13T00_12_43_David_-_Young_Australian_Male_Deep_Calming._pvc_s50_m2_e1fexe.mp3",
  },
  {
    id: "lilac-hush",
    gender: "female",
    label: "Lilac Hush",
    helper: "Calm, delicate, and close.",
    previewVoiceId: "m3yAHyFEFKtbCIM5n7GF",
    previewVoiceUrl: "https://res.cloudinary.com/tinkerbell/video/upload/v1783901961/ElevenLabs_2026-07-13T00_18_47_Ash_-_Conversational_Kind_and_Bright_pvc_s50_m2_y4zkp9.mp3",
  },
];