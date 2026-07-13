import { useEffect, useMemo, useRef, useState } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, LockKeyhole, Mic, PauseCircle, Play, Waves } from "lucide-react";
import AppButton from "@/components/ui/AppButton";
import {
  ambientPreviewVolume,
  previewAudioUrl,
  previewVoiceId,
  soundPresets,
  voicePreviewVolume,
  voicePresets,
} from "@/lib/audioPresets";
import { useTts } from "@/lib/queries";

type LetterRecord = {
  id: string;
  title: string;
  content: string;
  opens_at: string | null;
  is_locked: boolean;
  status: string;
  read_at: string | null;
  sender_id: string;
  recipient_id: string | null;
  sound_id: string | null;
  voice_id: string | null;
};

type LetterPageProps = {
  letter: LetterRecord;
  canOpen: boolean;
  now: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function formatCountdown(target: string | null, now: string) {
  if (!target) return null;

  const targetDate = new Date(target).getTime();
  const nowDate = new Date(now).getTime();
  const diff = Math.max(0, targetDate - nowDate);

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return { days, hours, minutes };
}

export const getServerSideProps: GetServerSideProps<LetterPageProps> = async (context) => {
  const id = typeof context.params?.id === "string" ? context.params.id : "";

  if (!supabaseUrl || !supabaseServiceKey || !id) {
    return { notFound: true };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: letter, error } = await supabase
    .from("open_when_letters")
    .select("id, title, content, opens_at, is_locked, status, read_at, sender_id, recipient_id, sound_id, voice_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !letter) {
    return { notFound: true };
  }

  const now = new Date().toISOString();
  const canOpen = !letter.is_locked || !letter.opens_at || new Date(letter.opens_at).getTime() <= Date.now();

  if (canOpen && !letter.read_at) {
    await supabase
      .from("open_when_letters")
      .update({ read_at: now })
      .eq("id", letter.id)
      .is("read_at", null);
  }

  return {
    props: {
      letter: {
        id: letter.id,
        title: letter.title,
        content: letter.content,
        opens_at: letter.opens_at,
        is_locked: letter.is_locked,
        status: letter.status,
        read_at: letter.read_at ?? now,
        sender_id: letter.sender_id,
        recipient_id: letter.recipient_id,
        sound_id: letter.sound_id,
        voice_id: letter.voice_id,
      },
      canOpen,
      now,
    },
  };
};

export default function LetterPage({ letter, canOpen, now }: LetterPageProps) {
  const router = useRouter();
  const [soundSelected, setSoundSelected] = useState(true);
  const [voiceSelected, setVoiceSelected] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.1);
  const [voiceVolume, setVoiceVolume] = useState(0.85);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceLoadError, setVoiceLoadError] = useState<string | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioUrlRef = useRef<string | null>(null);
  const previousSoundSelectedRef = useRef(soundSelected);
  const previousVoiceSelectedRef = useRef(voiceSelected);
  const soundWasPlayingBeforeDisableRef = useRef(false);
  const voiceWasPlayingBeforeDisableRef = useRef(false);
  const ttsMutation = useTts();

  const soundPreset = letter.sound_id ? soundPresets.find((option) => option.id === letter.sound_id) ?? null : null;
  const voicePreset = letter.voice_id ? voicePresets.find((option) => option.id === letter.voice_id) ?? null : null;

  useEffect(() => {
    return () => {
      ambientAudioRef.current?.pause();
      voiceAudioRef.current?.pause();

      if (voiceAudioUrlRef.current) {
        URL.revokeObjectURL(voiceAudioUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const wasSelected = previousSoundSelectedRef.current;
    previousSoundSelectedRef.current = soundSelected;

    if (wasSelected && !soundSelected) {
      soundWasPlayingBeforeDisableRef.current = ambientPlaying;
      ambientAudioRef.current?.pause();
      setAmbientPlaying(false);
      return;
    }

    if (!wasSelected && soundSelected) {
      if (!soundWasPlayingBeforeDisableRef.current || !ambientAudioRef.current) {
        return;
      }

      soundWasPlayingBeforeDisableRef.current = false;
      void ambientAudioRef.current
        .play()
        .then(() => setAmbientPlaying(true))
        .catch(() => setAmbientPlaying(false));
    }
  }, [ambientPlaying, soundSelected]);

  useEffect(() => {
    const wasSelected = previousVoiceSelectedRef.current;
    previousVoiceSelectedRef.current = voiceSelected;

    if (wasSelected && !voiceSelected) {
      voiceWasPlayingBeforeDisableRef.current = voicePlaying;
      voiceAudioRef.current?.pause();
      setVoicePlaying(false);
      return;
    }

    if (!wasSelected && voiceSelected) {
      if (!voiceWasPlayingBeforeDisableRef.current || !voiceAudioRef.current) {
        return;
      }

      voiceWasPlayingBeforeDisableRef.current = false;
      void voiceAudioRef.current
        .play()
        .then(() => setVoicePlaying(true))
        .catch(() => setVoicePlaying(false));
    }
  }, [voicePlaying, voiceSelected]);

  const liveCountdown = useMemo(() => formatCountdown(letter.opens_at, now), [letter.opens_at, now]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    void router.push("/dashboard");
  };

  const stopSelectedPlayback = () => {
    ambientAudioRef.current?.pause();
    voiceAudioRef.current?.pause();
    setAmbientPlaying(false);
    setVoicePlaying(false);
  };

  const playSelected = async () => {
    if (ambientPlaying || voicePlaying) {
      stopSelectedPlayback();
      return;
    }

    if (soundSelected && soundPreset && ambientAudioRef.current) {
      ambientAudioRef.current.src = soundPreset.previewAudioUrl;
      ambientAudioRef.current.currentTime = 0;
      ambientAudioRef.current.volume = soundVolume;

      try {
        await ambientAudioRef.current.play();
        setAmbientPlaying(true);
      } catch {
        setAmbientPlaying(false);
      }
    }

    if (voiceSelected && voicePreset && letter.voice_id && voiceAudioRef.current) {
      try {
        const result = await ttsMutation.mutateAsync({
          text: letter.content,
          voiceId: previewVoiceId,
          modelId: "eleven_flash_v2_5",
        });

        const objectUrl = URL.createObjectURL(result.audioBlob);

        if (voiceAudioUrlRef.current) {
          URL.revokeObjectURL(voiceAudioUrlRef.current);
        }

        voiceAudioUrlRef.current = objectUrl;
        voiceAudioRef.current.src = objectUrl;
        voiceAudioRef.current.currentTime = 0;
        voiceAudioRef.current.volume = voiceVolume;
        await voiceAudioRef.current.play();
        setVoicePlaying(true);
        setVoiceLoadError(null);
      } catch {
        setVoicePlaying(false);
        setVoiceLoadError("Voice could not be loaded right now.");
      }
    }
  };

  if (!canOpen) {
    return (
      <main className="min-h-screen bg-[#fff7fa] px-6 py-16 text-[#5f2f43]">
        <div className="mx-auto flex max-w-2xl flex-col items-center rounded-4xl border border-[rgba(238,195,210,0.7)] bg-white p-8 text-center shadow-[0_20px_60px_rgba(128,63,89,0.08)]">
          <div className="mb-6 flex w-full justify-start">
            <AppButton variant="ghost" onClick={handleBack}>
              <ArrowLeft size={16} /> Back
            </AppButton>
          </div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[rgba(138,53,84,0.08)] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#8a3554]">
            <LockKeyhole size={12} /> Locked note
          </p>
          <h1 className="mt-4 text-3xl font-bold">This note is not ready yet.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#7f465b]">
            Come back when the countdown finishes.
          </p>
          {liveCountdown ? (
            <div className="mt-8 rounded-3xl border border-[rgba(191,127,150,0.2)] bg-[#fff1f5] px-6 py-5">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8a3554]">Ready in</p>
              <p className="mt-2 text-4xl font-bold text-[#5f2f43]">
                {liveCountdown.days}d {liveCountdown.hours}h {liveCountdown.minutes}m
              </p>
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff7fa] px-6 py-16 text-[#5f2f43]">
      <div className="mx-auto max-w-3xl rounded-4xl border border-[rgba(238,195,210,0.7)] bg-white p-8 shadow-[0_20px_60px_rgba(128,63,89,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a3554]">Open when</p>
          <AppButton variant="ghost" onClick={handleBack}>
            <ArrowLeft size={16} /> Back
          </AppButton>
        </div>
        <h1 className="mt-4 text-4xl font-bold">{letter.title}</h1>
        <p className="mt-3 text-sm text-[#936273]">
          {letter.read_at ? "Read and opened." : "Opened now."}
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#8a3554]">
          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(138,53,84,0.08)] px-2 py-1">
            <Waves size={12} /> {soundPreset?.label ?? "Saved sound"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(138,53,84,0.08)] px-2 py-1">
            <Mic size={12} /> {voicePreset?.label ?? "Saved voice"}
          </span>
        </div>
        <div className="mt-6 rounded-3xl border border-[rgba(191,127,150,0.16)] bg-[#fff9fb] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a3554]">Play options</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[rgba(191,127,150,0.2)] bg-white px-4 py-3 text-sm font-semibold text-[#5f2f43]">
              <input
                type="checkbox"
                checked={soundSelected}
                onChange={(event) => setSoundSelected(event.target.checked)}
                className="h-4 w-4 rounded border-[rgba(127,70,91,0.35)] text-[#8a3554] accent-[#8a3554]"
              />
              <span>
                <span className="block">Sound</span>
                <span className="block text-xs font-normal text-[#936273]">Play the saved sound</span>
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[rgba(191,127,150,0.2)] bg-white px-4 py-3 text-sm font-semibold text-[#5f2f43]">
              <input
                type="checkbox"
                checked={voiceSelected}
                onChange={(event) => setVoiceSelected(event.target.checked)}
                className="h-4 w-4 rounded border-[rgba(127,70,91,0.35)] text-[#8a3554] accent-[#8a3554]"
              />
              <span>
                <span className="block">Voice</span>
                <span className="block text-xs font-normal text-[#936273]">Play the saved voice</span>
              </span>
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 rounded-2xl border border-[rgba(191,127,150,0.2)] bg-white px-4 py-3 text-sm font-semibold text-[#5f2f43]">
              Sound volume
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(soundVolume * 100)}
                onChange={(event) => setSoundVolume(Number(event.target.value) / 100)}
                className="h-2 w-full cursor-pointer accent-[#8a3554]"
              />
              <span className="text-xs font-normal text-[#936273]">{Math.round(soundVolume * 100)}%</span>
            </label>

            <label className="grid gap-2 rounded-2xl border border-[rgba(191,127,150,0.2)] bg-white px-4 py-3 text-sm font-semibold text-[#5f2f43]">
              Voice volume
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(voiceVolume * 100)}
                onChange={(event) => setVoiceVolume(Number(event.target.value) / 100)}
                className="h-2 w-full cursor-pointer accent-[#8a3554]"
              />
              <span className="text-xs font-normal text-[#936273]">{Math.round(voiceVolume * 100)}%</span>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void playSelected()}
              disabled={(!soundSelected && !voiceSelected) || (!soundPreset && soundSelected) || (!voicePreset && voiceSelected) || (!letter.voice_id && voiceSelected)}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-[rgba(119,69,88,0.18)] bg-[rgba(255,247,250,0.9)] px-4 py-3 text-sm font-bold text-[#774558] transition hover:bg-[rgba(255,247,250,1)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ambientPlaying || voicePlaying ? <PauseCircle size={16} /> : <Play size={16} />}
              {ambientPlaying || voicePlaying ? "Pause selected" : "Play selected"}
            </button>

            {ambientPlaying || voicePlaying ? (
              <button
                type="button"
                onClick={stopSelectedPlayback}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(119,69,88,0.18)] bg-white px-4 py-3 text-sm font-bold text-[#774558] transition hover:bg-[rgba(255,247,250,1)]"
              >
                Stop
              </button>
            ) : null}
          </div>

          <p className="mt-3 text-xs leading-5 text-[#936273]">
            {voiceLoadError
              ? voiceLoadError
              : voiceSelected && !voicePreset
                ? "Voice could not be loaded."
                : ""}
          </p>
        </div>
        <audio ref={ambientAudioRef} preload="none" onEnded={() => setAmbientPlaying(false)} onPause={() => setAmbientPlaying(false)} />
        <audio ref={voiceAudioRef} preload="none" onEnded={() => setVoicePlaying(false)} onPause={() => setVoicePlaying(false)} />
        <div className="mt-8 whitespace-pre-wrap rounded-3xl border border-[rgba(191,127,150,0.16)] bg-[#fff9fb] p-6 text-lg leading-8 text-[#5f2f43]">
          {letter.content}
        </div>
      </div>
    </main>
  );
}