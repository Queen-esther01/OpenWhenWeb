import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Check,
  ChevronDown,
  Heart,
  LockKeyhole,
  Mic,
  MoonStar,
  PauseCircle,
  Play,
  Sparkles,
  Waves,
} from "lucide-react";
import toast from "react-hot-toast";
import AppButton from "@/components/ui/AppButton";
import {
  ambientPreviewVolume,
  previewVoiceUrl,
  soundPresets,
  voicePreviewVolume,
  voicePresets,
} from "@/lib/audioPresets";
import { supabase } from "@/lib/supabaseClient";
import { useSaveLetterDraft, useSendLetter, useTts } from "@/lib/queries";

type CreateLetterWorkflowModalProps = {
  open: boolean;
  onClose: () => void;
  onDraftSaved?: () => void | Promise<void>;
  recipientEmail?: string | null;
  recipientName?: string | null;
  initialDraft?: {
    id: string;
    title: string;
    content: string;
    opens_at: string | null;
    is_locked: boolean;
    category_id: string | null;
    sound_id: string | null;
    voice_id: string | null;
  } | null;
};

type OpenWhenCategory = {
  id: string;
  label: string;
  displayLabel: string;
  helper: string;
  previewText: string;
};

type VoicePreset = {
  id: string;
  label: string;
  helper: string;
  gender?: "male" | "female";
  previewVoiceId: string;
  previewVoiceUrl: string;
};

function formatDatetimeLocalValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

const openWhenCategories: OpenWhenCategory[] = [
  {
    id: "sad",
    label: "Sad",
    displayLabel: 'Open when "sad"',
    helper: "For the heavy days.",
    previewText:
      "My love, if today feels heavy, please set this down and breathe with me for a moment. You do not need to carry it all alone.",
  },
  {
    id: "happy",
    label: "Happy",
    displayLabel: 'Open when "happy"',
    helper: "For celebration and joy.",
    previewText:
      "I hope this finds you smiling already. Keep that brightness close, because I am cheering for you in every little win.",
  },
  {
    id: "missing-me",
    label: "Missing me",
    displayLabel: 'Open when "missing me"',
    helper: "For the days apart.",
    previewText:
      "If you are missing me, I am missing you too. Let this be a soft reminder that our hearts still meet here.",
  },
  {
    id: "anxious",
    label: "Anxious",
    displayLabel: 'Open when "anxious"',
    helper: "For the spiraling moments.",
    previewText:
      "Pause with me. You are safe in this moment, and you do not need to solve everything right now.",
  },
  {
    id: "goodnight",
    label: "Goodnight",
    displayLabel: 'Open when "its time for bed"',
    helper: "For a tender bedtime note.",
    previewText:
      "Before you sleep, let this wrap around you like a blanket. You are loved, you are held, and tomorrow is allowed to be softer.",
  },
  {
    id: "no-category",
    label: "No category",
    displayLabel: "Open with no category",
    helper: "When it should arrive unfiltered.",
    previewText:
      "This one has no label, only intention. A small message for exactly when it is needed.",
  },
];

function formatVoiceLabel(voice: VoicePreset) {
  return voice.gender ? `${voice.label} [${voice.gender}]` : voice.label;
}


export default function CreateLetterWorkflowModal({
  open,
  onClose,
  onDraftSaved,
  recipientEmail,
  recipientName,
  initialDraft,
}: CreateLetterWorkflowModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    openWhenCategories[0].id,
  );
  const [selectedSoundId, setSelectedSoundId] = useState(soundPresets[0].id);
  const [selectedVoiceId, setSelectedVoiceId] = useState(voicePresets[0].id);
  const [isLocked, setIsLocked] = useState(true);
  const [openAt, setOpenAt] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [activeVoiceSampleId, setActiveVoiceSampleId] = useState<string | null>(null);
  const [ambientPreviewPlaying, setAmbientPreviewPlaying] = useState(false);
  const [voiceSamplePlaying, setVoiceSamplePlaying] = useState(false);
  const [fullAmbientPlaying, setFullAmbientPlaying] = useState(false);
  const [fullVoicePlaying, setFullVoicePlaying] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const previewAmbientRef = useRef<HTMLAudioElement | null>(null);
  const previewVoiceSampleRef = useRef<HTMLAudioElement | null>(null);
  const previewVoiceRef = useRef<HTMLAudioElement | null>(null);
  const activeVoiceObjectUrlRef = useRef<string | null>(null);
  const ttsMutation = useTts();
  const saveDraftMutation = useSaveLetterDraft();
  const sendLetterMutation = useSendLetter();

  const selectedCategory =
    openWhenCategories.find((option) => option.id === selectedCategoryId) ??
    openWhenCategories[0];
  const selectedSound =
    soundPresets.find((option) => option.id === selectedSoundId) ??
    soundPresets[0];
  const selectedVoice =
    voicePresets.find((option) => option.id === selectedVoiceId) ??
    voicePresets[0];

  const previewText = message.trim() || selectedCategory.previewText;
  const previewTitle = title.trim() || selectedCategory.displayLabel;
  const minimumOpenAt = formatDatetimeLocalValue(new Date(Date.now() + 60_000));
  const hasValidOpenAt = !isLocked || Boolean(openAt && new Date(openAt).getTime() > Date.now());
  const canSubmitLockedNote = !isLocked || hasValidOpenAt;
  const lockedDateValidationMessage = "Choose a future opening date and time when the note is locked.";
  const canSendNote = canSubmitLockedNote && Boolean(recipientEmail);

  useEffect(() => {
    return () => {
      if (activeVoiceObjectUrlRef.current) {
        URL.revokeObjectURL(activeVoiceObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialDraft) {
      setSavedDraftId(initialDraft.id);
      setTitle(initialDraft.title);
      setMessage(initialDraft.content);
      setIsLocked(initialDraft.is_locked);
      setOpenAt(initialDraft.opens_at ? initialDraft.opens_at.slice(0, 16) : "");
      setSelectedCategoryId(initialDraft.category_id ?? openWhenCategories[0].id);
      setSelectedSoundId(initialDraft.sound_id ?? soundPresets[0].id);
      setSelectedVoiceId(initialDraft.voice_id ?? voicePresets[0].id);
      setValidationMessage("");
      return;
    }

    setSavedDraftId(null);
    setSelectedCategoryId(openWhenCategories[0].id);
    setSelectedSoundId(soundPresets[0].id);
    setSelectedVoiceId(voicePresets[0].id);
    setIsLocked(true);
    setOpenAt("");
    setTitle("");
    setMessage("");
    setValidationMessage("");
  }, [open, initialDraft]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!canSubmitLockedNote) {
      if (validationMessage !== lockedDateValidationMessage) {
        setValidationMessage(lockedDateValidationMessage);
      }
      return;
    }

    if (validationMessage === lockedDateValidationMessage) {
      setValidationMessage("");
    }
  }, [open, canSubmitLockedNote, validationMessage]);

  useEffect(() => {
    if (!open) {
      previewAmbientRef.current?.pause();
      previewVoiceSampleRef.current?.pause();
      previewVoiceRef.current?.pause();
      setAmbientPreviewPlaying(false);
      setVoiceSamplePlaying(false);
      setFullAmbientPlaying(false);
      setFullVoicePlaying(false);
      setActiveSoundId(null);
      setActiveVoiceSampleId(null);
      setValidationMessage("");
      setSavedDraftId(null);
    }
  }, [open]);

  const playAudio = async (
    audioRef: { current: HTMLAudioElement | null },
    sourceUrl: string,
    volume: number,
  ) => {
    const audio = audioRef.current;

    if (!audio) {
      return false;
    }

    audio.pause();
    audio.src = sourceUrl;
    audio.currentTime = 0;
    audio.volume = volume;

    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  };

  const stopPreview = () => {
    previewAmbientRef.current?.pause();
    previewVoiceSampleRef.current?.pause();
    previewVoiceRef.current?.pause();
    setAmbientPreviewPlaying(false);
    setVoiceSamplePlaying(false);
    setFullAmbientPlaying(false);
    setFullVoicePlaying(false);
    setActiveSoundId(null);
    setActiveVoiceSampleId(null);
  };

  const toggleAmbientPreview = async (soundId: string, audioUrl: string) => {
    const audio = previewAmbientRef.current;

    if (!audio) {
      return;
    }

    if (ambientPreviewPlaying && activeSoundId === soundId) {
      audio.pause();
      setAmbientPreviewPlaying(false);
      setActiveSoundId(null);
      return;
    }

    const success = await playAudio(previewAmbientRef, audioUrl, ambientPreviewVolume);

    if (success) {
      setAmbientPreviewPlaying(true);
      setActiveSoundId(soundId);
    } else {
      setAmbientPreviewPlaying(false);
      setActiveSoundId(null);
    }
  };

  const toggleVoiceSamplePreview = async (voiceId: string, audioUrl: string) => {
    const voiceAudio = previewVoiceSampleRef.current;

    if (!voiceAudio) {
      return;
    }

    if (voiceSamplePlaying && activeVoiceSampleId === voiceId) {
      voiceAudio.pause();
      setVoiceSamplePlaying(false);
      setActiveVoiceSampleId(null);
      return;
    }

    const success = await playAudio(previewVoiceSampleRef, audioUrl, voicePreviewVolume);

    if (success) {
      setVoiceSamplePlaying(true);
      setActiveVoiceSampleId(voiceId);
    } else {
      setVoiceSamplePlaying(false);
      setActiveVoiceSampleId(null);
    }
  };

  const playFullVoice = () => {
    const voiceAudio = previewVoiceRef.current;

    if (!voiceAudio) {
      return;
    }

    ttsMutation.mutate(
      {
        text: previewText,
        voiceId: selectedVoice.previewVoiceId,
        modelId: "eleven_flash_v2_5",
      },
      {
        onSuccess: async ({ audioBlob }) => {
          const objectUrl = URL.createObjectURL(audioBlob);

          if (activeVoiceObjectUrlRef.current) {
            URL.revokeObjectURL(activeVoiceObjectUrlRef.current);
          }

          activeVoiceObjectUrlRef.current = objectUrl;
          const success = await playAudio(previewVoiceRef, objectUrl, voicePreviewVolume);

          if (success) {
            setFullVoicePlaying(true);
          } else {
            setFullVoicePlaying(false);
          }
        },
        onError: () => {
          setFullVoicePlaying(false);
        },
      },
    );
  };

  const handlePreviewWholeNote = async () => {
    if (fullAmbientPlaying || fullVoicePlaying) {
      stopPreview();
      return;
    }

    setValidationMessage("");
    previewAmbientRef.current?.pause();
    previewVoiceSampleRef.current?.pause();
    setAmbientPreviewPlaying(false);
    setVoiceSamplePlaying(false);
    setActiveSoundId(null);
    setActiveVoiceSampleId(null);
    await toggleAmbientPreview(selectedSound.id, selectedSound.previewAudioUrl);
    setFullAmbientPlaying(true);
    playFullVoice();
  };

  const handleLockChange = (locked: boolean) => {
    setIsLocked(locked);
    if (!locked) {
      setOpenAt("");
    }
  };

  const handleSaveDraft = async () => {
    if (!canSubmitLockedNote) {
      setValidationMessage(lockedDateValidationMessage);
      return;
    }

    if (!supabase) {
      setValidationMessage("Supabase is not configured yet.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setValidationMessage("You need to be signed in to save a draft.");
      return;
    }

    const draftId = savedDraftId ?? initialDraft?.id ?? null;

    try {
      const result = await saveDraftMutation.mutateAsync({
        accessToken,
        draftId,
        title: title.trim() || selectedCategory.displayLabel,
        content: previewText,
        opensAt: isLocked && openAt ? new Date(openAt).toISOString() : null,
        isLocked,
        categoryId: selectedCategory.id,
        soundId: selectedSound.id,
        voiceId: selectedVoice.id,
      });

      setSavedDraftId(result.draftId);
      await onDraftSaved?.();
      toast.success("Draft saved.");
      onClose();
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : "Unable to save draft right now.");
    }
  };

  const handleSendNote = async () => {
    if (!canSendNote) {
      setValidationMessage(
        recipientEmail
          ? lockedDateValidationMessage
          : "Connect with your partner before sending a note.",
      );
      return;
    }

    if (!supabase) {
      setValidationMessage("Supabase is not configured yet.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setValidationMessage("You need to be signed in to send a note.");
      return;
    }

    const draftId = savedDraftId ?? initialDraft?.id ?? null;

    try {
      await sendLetterMutation.mutateAsync({
        accessToken,
        draftId,
        title: title.trim() || selectedCategory.displayLabel,
        content: previewText,
        opensAt: isLocked && openAt ? new Date(openAt).toISOString() : null,
        isLocked,
        categoryId: selectedCategory.id,
        soundId: selectedSound.id,
        voiceId: selectedVoice.id,
        recipientEmail,
        recipientName,
      });

      setValidationMessage("");
      await onDraftSaved?.();
      toast.success("Note sent.");
      onClose();
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : "Unable to send note right now.");
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#3d2030]/45 px-4 py-4 backdrop-blur-sm md:items-start"
      onClick={onClose}
    >
      <div
        className="relative my-4 w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-[rgba(238,195,210,0.72)] bg-[linear-gradient(180deg,rgba(255,252,251,0.99),rgba(255,244,247,0.96))] shadow-[0_28px_60px_rgba(71,27,48,0.2)] md:max-h-[calc(100vh-2rem)] md:overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(255,225,231,0.95),transparent_55%),radial-gradient(circle_at_top_right,rgba(255,239,233,0.92),transparent_42%)]" />

        <div className="relative grid gap-6 px-5 py-5 md:grid-cols-[1.05fr_0.95fr] md:p-6">
          <div className="flex items-start justify-between gap-4 md:col-span-2">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(191,127,150,0.18)] bg-white/80 px-3 py-1 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-[#8a3554]">
                <Sparkles size={13} aria-hidden="true" />
                Create an Open When note
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif] md:text-4xl">
                Build the feeling before you send it.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7f465b] md:text-base">
                Choose the emotional category, pick a sound and voice, preview
                the full experience, and decide whether it should stay locked.
              </p>
            </div>

          </div>

          <form className="grid gap-5 md:gap-6" onSubmit={(event) => event.preventDefault()}>
            <section className="rounded-[1.35rem] border border-[rgba(191,127,150,0.18)] bg-white/70 p-4 shadow-[0_12px_28px_rgba(128,63,89,0.06)]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8a3554]">
                <Heart size={14} fill="currentColor" /> Letter details
              </div>
              <div className="mt-4 grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-[#6a4050]">
                  Letter title
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="A note for the right moment"
                    className="rounded-2xl border border-[rgba(191,127,150,0.28)] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#b08d99]"
                  />
                </label>

                    <label className="grid gap-2 text-sm font-semibold text-[#6a4050]">
                      Message
                      <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder={selectedCategory.previewText}
                        rows={6}
                        className="min-h-36 rounded-2xl border border-[rgba(191,127,150,0.28)] bg-white px-4 py-3 text-sm leading-6 outline-none placeholder:text-[#b08d99]"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-[1.35rem] border border-[rgba(191,127,150,0.18)] bg-white/70 p-4 shadow-[0_12px_28px_rgba(128,63,89,0.06)]">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8a3554]">
                    <MoonStar size={14} aria-hidden="true" /> Open when
                  </div>

                  <div className="mt-4 grid gap-4">
                    <label className="grid gap-2 text-sm font-semibold text-[#6a4050]">
                      Choose a category
                      <div className="relative">
                        <select
                          value={selectedCategoryId}
                          onChange={(event) => setSelectedCategoryId(event.target.value)}
                          className="w-full appearance-none rounded-2xl border border-[rgba(191,127,150,0.28)] bg-white px-4 py-3 pr-12 text-sm outline-none"
                        >
                          {openWhenCategories.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.displayLabel}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          aria-hidden="true"
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8a3554]"
                        />
                      </div>
                    </label>

                    <div className="rounded-2xl border border-[rgba(191,127,150,0.22)] bg-[rgba(255,255,255,0.85)] p-4 text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-[#5f2f43]">
                            {selectedCategory.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#7f465b]">
                            {selectedCategory.helper}
                          </p>
                        </div>
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#8a3554] text-[#fddce7]">
                          <Check size={13} />
                        </span>
                      </div>
                      <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#8a3554]">
                        {selectedCategory.displayLabel}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.35rem] border border-[rgba(191,127,150,0.18)] bg-white/70 p-4 shadow-[0_12px_28px_rgba(128,63,89,0.06)]">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8a3554]">
                    <AudioLines size={14} aria-hidden="true" /> Sound
                  </div>

                  <div className="mt-4 grid gap-4">
                    <label className="grid gap-2 text-sm font-semibold text-[#6a4050]">
                      Choose a sound
                      <div className="relative">
                        <select
                          value={selectedSoundId}
                          onChange={(event) => setSelectedSoundId(event.target.value)}
                          className="w-full appearance-none rounded-2xl border border-[rgba(191,127,150,0.28)] bg-white px-4 py-3 pr-12 text-sm outline-none"
                        >
                          {soundPresets.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          aria-hidden="true"
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8a3554]"
                        />
                      </div>
                    </label>

                    <div className="rounded-2xl border border-[rgba(191,127,150,0.22)] bg-[rgba(255,255,255,0.85)] p-4 text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-[#5f2f43]">
                            {selectedSound.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#7f465b]">
                            {selectedSound.helper}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => void toggleAmbientPreview(selectedSound.id, selectedSound.previewAudioUrl)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[rgba(119,69,88,0.18)] bg-white px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[#774558] transition hover:bg-[rgba(255,255,255,0.7)]"
                        >
                          {ambientPreviewPlaying && activeSoundId === selectedSound.id ? (
                            <PauseCircle size={12} />
                          ) : (
                            <Play size={12} />
                          )}
                          {ambientPreviewPlaying && activeSoundId === selectedSound.id ? "Pause" : "Preview"}
                        </button>
                      </div>
                      <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#8a3554]">
                        Selected sound
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.35rem] border border-[rgba(191,127,150,0.18)] bg-white/70 p-4 shadow-[0_12px_28px_rgba(128,63,89,0.06)]">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8a3554]">
                    <Mic size={14} aria-hidden="true" /> Voice
                  </div>

                  <div className="mt-4 grid gap-4">
                    <label className="grid gap-2 text-sm font-semibold text-[#6a4050]">
                      Choose a voice
                      <div className="relative">
                        <select
                          value={selectedVoiceId}
                          onChange={(event) => setSelectedVoiceId(event.target.value)}
                          className="w-full appearance-none rounded-2xl border border-[rgba(191,127,150,0.28)] bg-white px-4 py-3 pr-12 text-sm outline-none"
                        >
                          {voicePresets.map((option) => (
                            <option key={option.id} value={option.id}>
                              {formatVoiceLabel(option)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          aria-hidden="true"
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8a3554]"
                        />
                      </div>
                    </label>

                    <div className="rounded-2xl border border-[rgba(191,127,150,0.22)] bg-[rgba(255,255,255,0.85)] p-4 text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-[#5f2f43]">
                            {formatVoiceLabel(selectedVoice)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#7f465b]">
                            {selectedVoice.helper}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (voiceSamplePlaying && activeVoiceSampleId === selectedVoice.id) {
                              previewVoiceSampleRef.current?.pause();
                              setVoiceSamplePlaying(false);
                              setActiveVoiceSampleId(null);
                              return;
                            }

                            void toggleVoiceSamplePreview(selectedVoice.id, selectedVoice.previewVoiceUrl);
                          }}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[rgba(119,69,88,0.18)] bg-white px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[#774558] transition hover:bg-[rgba(255,255,255,0.7)]"
                        >
                          {voiceSamplePlaying && activeVoiceSampleId === selectedVoice.id ? (
                            <PauseCircle size={12} />
                          ) : (
                            <Play size={12} />
                          )}
                          {voiceSamplePlaying && activeVoiceSampleId === selectedVoice.id ? "Pause" : "Preview"}
                        </button>
                      </div>
                      <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#8a3554]">
                        Selected voice
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.35rem] border border-[rgba(191,127,150,0.18)] bg-[linear-gradient(135deg,rgba(255,242,246,0.95),rgba(255,248,244,0.95))] p-4 shadow-[0_12px_28px_rgba(128,63,89,0.06)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[#8a3554]">
                        Full preview
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                        Hear it the way your person will.
                      </h3>
                    </div>

                    <AppButton variant="ghost" onClick={handlePreviewWholeNote} className="whitespace-nowrap">
                      {fullAmbientPlaying || fullVoicePlaying ? <PauseCircle size={15} /> : <Play size={15} />}&nbsp;
                      {fullAmbientPlaying || fullVoicePlaying ? "Stop preview" : "Preview all"}
                    </AppButton>
                  </div>

                  <div className="mt-4 rounded-[1.2rem] border border-[rgba(191,127,150,0.25)] bg-white/82 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[#8a3554]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(138,53,84,0.08)] px-2 py-1">
                        {selectedCategory.displayLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(138,53,84,0.08)] px-2 py-1">
                        <Waves size={12} /> {selectedSound.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(138,53,84,0.08)] px-2 py-1">
                        <Mic size={12} /> {selectedVoice.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(138,53,84,0.08)] px-2 py-1">
                        <LockKeyhole size={12} /> {isLocked ? "Locked" : "Unlocked"}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[rgba(191,127,150,0.22)] bg-[linear-gradient(180deg,rgba(255,251,249,0.95),rgba(255,246,243,0.95))] p-4">
                      <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[#8a3554]">
                        {previewTitle}
                      </p>
                      <p className="mt-2 text-[0.95rem] leading-7 text-[#6e4153] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                        {previewText}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                    </div>

                    {validationMessage ? (
                      <p className="mt-3 text-xs leading-5 text-[#8a3554]">
                        {validationMessage}
                      </p>
                    ) : null}

                  </div>
                </section>
              </form>

              <aside className="grid content-start gap-4 rounded-[1.45rem] border border-[rgba(191,127,150,0.2)] bg-[rgba(255,252,251,0.85)] p-4 shadow-[0_12px_28px_rgba(128,63,89,0.05)]">
                <div className="rounded-[1.2rem] border border-[rgba(191,127,150,0.2)] bg-white/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8a3554]">
                    <LockKeyhole size={14} aria-hidden="true" /> Lock setting
                  </div>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[rgba(191,127,150,0.18)] bg-[rgba(255,248,250,0.8)] px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isLocked}
                      onChange={(event) => handleLockChange(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-[rgba(127,70,91,0.35)] text-[#8a3554] accent-[#8a3554]"
                    />
                    <span>
                      <span className="block text-sm font-bold text-[#5f2f43]">
                        Lock this message
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-[#7f465b]">
                        Keep it sealed until the open-when moment arrives.
                      </span>
                    </span>
                  </label>

                  {isLocked ? (
                    <label className="mt-4 grid gap-2 text-sm font-semibold text-[#6a4050]">
                      Opening date and time
                      <input
                        type="datetime-local"
                        value={openAt}
                        onChange={(event) => setOpenAt(event.target.value)}
                        min={minimumOpenAt}
                        className="rounded-2xl border border-[rgba(191,127,150,0.28)] bg-white px-4 py-3 text-sm outline-none"
                      />
                      <span className="text-xs font-normal leading-5 text-[#936273]">
                        Pick a future opening time for locked notes.
                      </span>
                    </label>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <AppButton
                      type="button"
                      variant="ghost"
                      onClick={() => void handleSaveDraft()}
                      disabled={saveDraftMutation.isPending || !canSubmitLockedNote}
                    >
                      {saveDraftMutation.isPending ? "Saving..." : "Save draft"}
                    </AppButton>
                    <AppButton type="button" onClick={handleSendNote} disabled={!canSendNote}>
                      Send note
                    </AppButton>
                    <AppButton type="button" variant="link" onClick={onClose} className="ml-auto px-0">
                      Close
                    </AppButton>
                  </div>
                </div>
              </aside>
            </div>

            <audio
              ref={previewAmbientRef}
              src={selectedSound.previewAudioUrl}
              preload="none"
              onPause={() => setAmbientPreviewPlaying(false)}
              onEnded={() => setAmbientPreviewPlaying(false)}
            />

            <audio
              ref={previewVoiceSampleRef}
              src={previewVoiceUrl}
              preload="none"
              onPause={() => setVoiceSamplePlaying(false)}
              onEnded={() => setVoiceSamplePlaying(false)}
            />

            <audio
              ref={previewVoiceRef}
              preload="none"
              onPause={() => setFullVoicePlaying(false)}
              onEnded={() => setFullVoicePlaying(false)}
            />
          </div>
        </div>
      );
}