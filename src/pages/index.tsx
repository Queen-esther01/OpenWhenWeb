import Head from "next/head";
import { useRouter } from "next/router";
import { Cormorant_Garamond, Nunito } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  CalendarClock,
  Heart,
  HeartHandshake,
  LockKeyhole,
  Mic,
  Play,
} from "lucide-react";
import AppButton from "@/components/ui/AppButton";
import FeatureCard from "@/components/ui/FeatureCard";
import SignupModal from "@/components/onboarding/SignupModal";
import { previewAudioUrl } from "@/lib/audioPresets";
import { supabase } from "@/lib/supabaseClient";

const romanticSerif = Cormorant_Garamond({
  variable: "--font-romantic-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const calmSans = Nunito({
  variable: "--font-calm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const previewVoiceText =
  "My darling, I know today has been hard, and I want you to know that I see you. I see your strength, your courage, and your heart. Even when the world feels heavy, remember that you are loved beyond measure. Take a deep breath, and let this be a reminder that you are never alone.";

export default function Home() {

  const router = useRouter();

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeVoiceObjectUrlRef = useRef<string | null>(null);

  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isVoicePreviewPlaying, setIsVoicePreviewPlaying] = useState(false);
  const [ambientEnabled, setAmbientEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [volume, setVolume] = useState(50);
  const [voiceVolume, setVoiceVolume] = useState(50);

  const isAnyPreviewPlaying = isPreviewPlaying || isVoicePreviewPlaying;
  const previewVoiceUrl = "https://res.cloudinary.com/tinkerbell/video/upload/v1783903727/ElevenLabs_2026-07-13T00_47_55_Joseff_Sweet_-_Comfort_and_Warmth_pvc_s50_m2_odfags.mp3"

  useEffect(() => {
    const audio = previewAudioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const audio = previewVoiceAudioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = voiceVolume / 100;
  }, [voiceVolume]);

  useEffect(() => {
    return () => {
      if (activeVoiceObjectUrlRef.current) {
        URL.revokeObjectURL(activeVoiceObjectUrlRef.current);
      }
    };
  }, []);

  const handleSendLetter = async () => {
    if (!supabase) {
      setIsSignupOpen(true);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await router.push("/dashboard");
    } else {
      setIsSignupOpen(true);
    }
  };

  const handlePreviewClick = async () => {
    const ambientAudio = previewAudioRef.current;
    const voiceAudio = previewVoiceAudioRef.current;

    if (!ambientEnabled && !voiceEnabled) {
      return;
    }

    if (isAnyPreviewPlaying) {
      ambientAudio?.pause();
      voiceAudio?.pause();
      setIsPreviewPlaying(false);
      setIsVoicePreviewPlaying(false);
      return;
    }

    if (ambientEnabled && ambientAudio) {
      try {
        await ambientAudio.play();
        setIsPreviewPlaying(true);
      } catch {
        setIsPreviewPlaying(false);
      }
    }

    if (voiceEnabled && voiceAudio) {
      voiceAudio.src = previewVoiceUrl;

      try {
        await voiceAudio.play();
        setIsVoicePreviewPlaying(true);
      } catch {
        setIsVoicePreviewPlaying(false);
      }
    }

  };

  const handleVolumeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setVolume(Number(event.target.value));
  };

  const handleVoiceVolumeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setVoiceVolume(Number(event.target.value));
  };

  return (
    <>
      <Head>
        <title>Open When | Love Sent With Intention</title>
        <meta
          name="description"
          content="Open When helps lovers send meaningful messages for emotions, moments, and milestones."
        />
      </Head>

      <div
        className={`${romanticSerif.variable} ${calmSans.variable} min-h-screen px-5 py-10 md:px-[1.8rem] md:py-14 [font-family:var(--font-calm-sans),Avenir_Next,Gill_Sans,sans-serif]`}
      >
        <main className="mx-auto max-w-260 rounded-4xl border border-[rgba(238,195,210,0.7)] bg-[linear-gradient(180deg,rgba(255,251,249,0.93)_0%,rgba(255,246,243,0.88)_100%)] p-[clamp(1.6rem,3vw,3rem)] shadow-[0_25px_60px_rgba(128,63,89,0.09),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-[2px] animate-[fade-in-up_650ms_ease-out_both] max-[520px]:rounded-[1.35rem] max-[520px]:p-[1.1rem]">
          <section
            className="grid items-stretch gap-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.8fr)] md:gap-5"
            aria-label="Open When introduction"
          >
            <header>
              <p className="mb-4 flex flex-nowrap items-center justify-start gap-2 max-[520px]:flex-wrap max-[520px]:justify-center">
                <span className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-full bg-[rgba(255,243,247,0.75)] px-3 py-1.5 text-[0.76rem] font-extrabold uppercase tracking-[0.08em] text-[#7c2f4d]">
                  Open When <Heart size={14} aria-hidden="true" />
                </span>
                <span className="h-px w-6 bg-[rgba(148,96,109,0.35)]" aria-hidden="true" />
                <span className="whitespace-nowrap text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[#8f6270]">
                  for intentional lovers
                </span>
              </p>

              <h1 className="m-0 mt-10 max-w-[14ch] text-[clamp(2.3rem,7vw,5.4rem)] leading-[0.94] font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif] max-[520px]:max-w-full">
                Love letters designed for the exact moment your person needs
                them.
              </h1>

              <p className="mt-5 max-w-[54ch] text-[clamp(1rem,2.5vw,1.18rem)] leading-[1.75] text-(--ink-soft)">
                For romance, birthdays, and the quiet in-between.
              </p>
            </header>

            <aside
              className="grid auto-rows-auto gap-3 self-end rounded-[1.2rem] border border-[rgba(216,149,173,0.42)] bg-[rgba(255,246,247,0.8)] p-4 shadow-[0_10px_22px_rgba(140,65,92,0.08)]"
              aria-label="Preview of an Open When letter"
            >
              <div className="flex flex-wrap justify-between gap-2 text-[0.76rem] font-bold uppercase tracking-[0.06em] text-[#7f465b]">
                <span>Locked Open-When</span>
                <span>Opens Feb 14, 8:00 PM</span>
              </div>

              <div
                className="relative min-h-38 rounded-2xl border border-[rgba(191,127,150,0.35)] bg-[rgba(255,252,251,0.93)] px-4 pt-4 pb-7"
                aria-hidden="true"
              >
                <p className="m-0 max-w-[34ch] text-[1.08rem] leading-tight text-[#6e4153] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                  My darling, I know today has been hard, and I want you to know that I see you. I see your strength, your courage, and your heart. Even when the world feels heavy, remember that you are loved beyond measure. Take a deep breath, and let this be a reminder that you are never alone.
                </p>
                <div className="absolute right-4 bottom-3 grid h-7 w-7 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#9f3159,#7b2243)] text-[#fddce7] shadow-[0_6px_12px_rgba(123,34,67,0.35)]">
                  <Heart size={13} fill="currentColor" />
                </div>
              </div>

              <div className="grid gap-2 rounded-2xl border border-[rgba(191,127,150,0.25)] bg-[rgba(255,255,255,0.58)] px-3 py-3 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-[#7f465b]">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ambientEnabled}
                    onChange={(event) => setAmbientEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-[rgba(127,70,91,0.35)] text-[#8a3554] accent-[#8a3554]"
                  />
                  <AudioLines size={15} aria-hidden="true" /> Ambient Piano
                </label>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(event) => setVoiceEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-[rgba(127,70,91,0.35)] text-[#8a3554] accent-[#8a3554]"
                  />
                  <Mic size={15} aria-hidden="true" /> Voice: Soft warmth
                </label>
              </div>

              <button
                type="button"
                onClick={handlePreviewClick}
                className="inline-flex cursor-pointer w-full items-center justify-center gap-1.5 rounded-full border border-transparent bg-[#8a3554] px-3 py-2.5 text-sm font-bold text-[#fff5fa] transition duration-150 hover:-translate-y-0.5 hover:bg-[#782b48]"
              >
                <Play size={15} aria-hidden="true" />
                {isAnyPreviewPlaying ? "Pause Preview" : "Preview This Letter"}
              </button>

              <label className="grid gap-2 rounded-2xl border border-[rgba(191,127,150,0.25)] bg-[rgba(255,255,255,0.58)] px-3 py-3 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-[#7f465b]">
                Volume {volume}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  aria-label="Preview volume"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[rgba(143,74,99,0.18)] accent-[#8a3554]"
                />
              </label>

              <label className="grid gap-2 rounded-2xl border border-[rgba(191,127,150,0.25)] bg-[rgba(255,255,255,0.58)] px-3 py-3 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-[#7f465b]">
                Voice Volume {voiceVolume}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={voiceVolume}
                  onChange={handleVoiceVolumeChange}
                  aria-label="Voice volume"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[rgba(143,74,99,0.18)] accent-[#8a3554]"
                />
              </label>

              <audio
                ref={previewAudioRef}
                src={previewAudioUrl}
                preload="none"
                onPause={() => setIsPreviewPlaying(false)}
                onEnded={() => setIsPreviewPlaying(false)}
              />

              <audio
                ref={previewVoiceAudioRef}
                preload="none"
                onPause={() => setIsVoicePreviewPlaying(false)}
                onEnded={() => setIsVoicePreviewPlaying(false)}
              />
            </aside>
          </section>

          <section
            className="mt-[clamp(1.8rem,4.5vw,3rem)] grid grid-cols-12 gap-4"
            aria-label="Open When message types"
          >
            <FeatureCard
              icon={
                <HeartHandshake size={24} strokeWidth={1.7} aria-hidden="true" />
              }
              title="Emotion-led Notes"
            >
              Create letters tagged for real feelings: passion, overwhelm,
              or anything personal between you two.
            </FeatureCard>

            <FeatureCard
              icon={
                <CalendarClock size={24} strokeWidth={1.7} aria-hidden="true" />
              }
              title="Locked Open-When"
            >
              Set a date and time for a future reveal or allow immediate access.
            </FeatureCard>

            <FeatureCard
              icon={
                <AudioLines size={24} strokeWidth={1.7} aria-hidden="true" />
              }
              title="Voice + Atmosphere"
            >
              Add music and voice for a more intimate opening.
            </FeatureCard>
          </section>

          <section
            className="mt-[1.15rem] text-center rounded-[1.2rem] border border-[rgba(234,173,165,0.65)] bg-[linear-gradient(120deg,rgba(255,237,236,0.95),rgba(255,242,236,0.92))] p-[1.2rem] md:mt-[1.4rem] md:p-[1.35rem] max-[520px]:p-4"
            aria-label="Open When promise"
          >
            <p className="m-0 text-[1.02rem] leading-[1.7] text-[#5e3c4a]">
              One person. One message. One intentional moment.
            </p>

            <div className="mt-4 flex flex-wrap justify-center items-center gap-3">
              <AppButton onClick={handleSendLetter}>
                Send a Letter
              </AppButton>
              <AppButton variant="link">
                <LockKeyhole size={15} aria-hidden="true" /> Create A Locked
                Anniversary Letter
              </AppButton>
            </div>
          </section>

          <SignupModal
            open={isSignupOpen}
            onClose={() => setIsSignupOpen(false)}
            onSignedIn={() => setIsSignupOpen(false)}
          />
        </main>
      </div>
    </>
  );
}