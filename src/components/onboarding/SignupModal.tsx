import { useMemo, useRef, useState } from "react";
import { Check, Heart, Mail, MoveRight, User, X } from "lucide-react";
import toast from "react-hot-toast";
import AppButton from "@/components/ui/AppButton";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

type SignupModalProps = {
  open: boolean;
  onClose: () => void;
  onSignedIn: () => void;
};

type Mode = "sign-in" | "sign-up";

function buildRedirectTo() {
  if (typeof window === "undefined") {
    return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`;
  }

  return `${window.location.origin}/auth/callback`;
}

export default function SignupModal({ open, onClose, onSignedIn }: SignupModalProps) {
  const [mode, setMode] = useState<Mode>("sign-up");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"form" | "sent">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedEmailRef = useRef("");

  const canSubmit = useMemo(() => {
    if (mode === "sign-in") {
      return email.trim().length > 3;
    }
    return username.trim().length > 1 && email.trim().length > 3 && usernameStatus === "available";
  }, [email, mode, username, usernameStatus]);

  const handleUsernameChange = (value: string) => {
    setUsername(value);

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    const trimmed = value.trim().toLowerCase();

    if (trimmed.length < 2) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");

    checkTimeoutRef.current = setTimeout(async () => {
      if (!supabase) {
        setUsernameStatus("idle");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", trimmed)
        .maybeSingle();

      if (error) {
        setUsernameStatus("idle");
        return;
      }

      setUsernameStatus(data ? "taken" : "available");
    }, 400);
  };

  if (!open) {
    return null;
  }

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setUsername("");
    setEmail("");
    setMessage("");
    setUsernameStatus("idle");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !hasSupabaseConfig) {
      setMessage("Add your Supabase env keys first, then try again.");
      return;
    }

    if (mode === "sign-up" && usernameStatus !== "available") {
      setMessage("Please choose a different username.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: buildRedirectTo(),
        shouldCreateUser: mode === "sign-up",
        data: mode === "sign-up" ? { username: normalizedUsername } : undefined,
      },
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    submittedEmailRef.current = normalizedEmail;
    setStage("sent");
    toast.success(mode === "sign-up" ? "Account created! Check your email." : "Check your email for the sign-in link.");
  };

  const handleReset = () => {
    setUsername("");
    setEmail("");
    setStage("form");
    setMessage("");
    setUsernameStatus("idle");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#3d2030]/35 px-4 py-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[1.5rem] border border-[rgba(238,195,210,0.6)] bg-[linear-gradient(180deg,rgba(255,252,251,0.98),rgba(255,244,247,0.96))] p-5 shadow-[0_24px_48px_rgba(71,27,48,0.18)] md:p-6"
        onClick={(e) => e.stopPropagation()}
      >

        {stage === "form" ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a3554]">
                  {mode === "sign-up" ? "Get started" : "Welcome back"}
                </p>
                <h2 className="mt-2 text-2xl font-bold leading-tight text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                  {mode === "sign-up" ? "Send your first love note." : "Sign in to your love space."}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-full px-3 py-1 text-sm font-semibold text-[#7f465b] transition hover:bg-white"
              >
                Close
              </button>
            </div>

            {/* Mode toggle */}
            <div className="mt-4 flex rounded-full border border-[rgba(191,127,150,0.28)] bg-[rgba(255,255,255,0.5)] p-0.5">
              <button
                type="button"
                onClick={() => switchMode("sign-up")}
                className={`cursor-pointer flex-1 rounded-full px-4 py-2 text-sm font-bold transition ${
                  mode === "sign-up"
                    ? "bg-[#8a3554] text-[#fddce7] shadow-sm"
                    : "text-[#7f465b] hover:bg-[rgba(255,255,255,0.5)]"
                }`}
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => switchMode("sign-in")}
                className={`cursor-pointer flex-1 rounded-full px-4 py-2 text-sm font-bold transition ${
                  mode === "sign-in"
                    ? "bg-[#8a3554] text-[#fddce7] shadow-sm"
                    : "text-[#7f465b] hover:bg-[rgba(255,255,255,0.5)]"
                }`}
              >
                Sign in
              </button>
            </div>

            <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
              {mode === "sign-up" ? (
                <label className="grid gap-2 text-sm font-semibold text-[#6a4050]">
                  Username
                  <span className="flex items-center gap-2 rounded-2xl border border-[rgba(191,127,150,0.28)] bg-white px-3 py-3">
                    <User size={16} className="text-[#8a3554] shrink-0" aria-hidden="true" />
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => handleUsernameChange(event.target.value)}
                      placeholder="your username"
                      autoComplete="nickname"
                      className="w-full border-0 bg-transparent outline-none placeholder:text-[#b08d99]"
                    />
                    {usernameStatus === "checking" ? (
                      <span className="shrink-0 text-xs text-[#936273]">...</span>
                    ) : usernameStatus === "available" ? (
                      <Check size={16} className="shrink-0 text-green-600" />
                    ) : usernameStatus === "taken" ? (
                      <X size={16} className="shrink-0 text-red-500" />
                    ) : null}
                  </span>
                  {usernameStatus === "taken" ? (
                    <p className="text-xs text-red-500">This username is taken.</p>
                  ) : usernameStatus === "available" ? (
                    <p className="text-xs text-green-700">Username available!</p>
                  ) : null}
                </label>
              ) : null}

              <label className="grid gap-2 text-sm font-semibold text-[#6a4050]">
                Email
                <span className="flex items-center gap-2 rounded-2xl border border-[rgba(191,127,150,0.28)] bg-white px-3 py-3">
                  <Mail size={16} className="text-[#8a3554]" aria-hidden="true" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full border-0 bg-transparent outline-none placeholder:text-[#b08d99]"
                  />
                </span>
              </label>

              <p className="text-sm leading-6 text-[#7f465b]">
                {mode === "sign-up"
                  ? "We'll send a one-time link. No password required."
                  : "Enter your email and we'll send you a magic link."}
              </p>

              {message ? (
                <p className="rounded-2xl border border-[rgba(143,74,99,0.2)] bg-[rgba(255,255,255,0.65)] px-3 py-3 text-sm font-medium text-[#6a4050]">
                  {message}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <AppButton type="submit">
                  {isSubmitting ? "Sending link..." : "Send my one-time link"}
                </AppButton>
                <AppButton variant="ghost" onClick={onClose}>
                  {mode === "sign-up" ? "Maybe later" : "Cancel"}
                </AppButton>
              </div>

              {!hasSupabaseConfig ? (
                <p className="text-xs leading-5 text-[#936273]">
                  Add the Supabase env keys first so this form can send magic links.
                </p>
              ) : null}
              {!canSubmit ? (
                <p className="text-xs leading-5 text-[#936273]">
                  {mode === "sign-up"
                    ? "Username and email are required."
                    : "Please enter your email."}
                </p>
              ) : null}
            </form>
          </>
        ) : (
          /* ── Magic link confirmation screen ── */
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#8a3554]">
              <Mail size={24} className="text-[#fddce7]" />
            </div>

            <h2 className="mt-4 text-2xl font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
              Halfway there
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#7f465b]">
              We sent a magic link to{" "}
              <strong className="text-[#5f2f43]">{submittedEmailRef.current}</strong>.
              Click it to finish signing in and enter your love space.
            </p>

            <div className="mt-5 rounded-2xl border border-[rgba(191,127,150,0.2)] bg-[rgba(255,242,245,0.5)] px-4 py-4 text-left">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8a3554]">
                What happens next
              </p>
              <ol className="mt-3 grid gap-2 text-sm text-[#6a4050]">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#8a3554] text-[0.65rem] font-bold text-[#fddce7]">1</span>
                  Check your inbox (and spam) for the magic link email
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#8a3554] text-[0.65rem] font-bold text-[#fddce7]">2</span>
                  Click the link &mdash; it expires in 5 minutes
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#8a3554] text-[0.65rem] font-bold text-[#fddce7]">3</span>
                  You&rsquo;ll land in your dashboard ready to write
                </li>
              </ol>
            </div>

            <p className="mt-4 text-xs text-[#936273]">
              Didn&rsquo;t get it?{" "}
              <button
                type="button"
                onClick={handleReset}
                className="cursor-pointer font-semibold text-[#8a3554] underline underline-offset-2"
              >
                Try a different email
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}