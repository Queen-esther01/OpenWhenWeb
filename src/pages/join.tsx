import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Heart, Mail, Check } from "lucide-react";
import toast from "react-hot-toast";
import { supabase, hasSupabaseConfig } from "@/lib/supabaseClient";
import AppButton from "@/components/ui/AppButton";

function buildRedirectTo() {
  if (typeof window === "undefined") {
    return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`;
  }
  return `${window.location.origin}/auth/callback`;
}

export default function JoinPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "signed-out" | "sending" | "sent" | "connected" | "no-invite" | "error">("loading");
  const [inviterName, setInviterName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!router.isReady) return;

    const email = router.query.email as string | undefined;
    if (!email) {
      setStatus("no-invite");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setPartnerEmail(normalizedEmail);

    const check = async () => {
      if (!hasSupabaseConfig || !supabase) {
        setStatus("error");
        return;
      }

      // Fetch the invite to get the inviter's name
      const { data: invites } = await supabase
        .from("partner_invites")
        .select("partner_name, invited_by")
        .eq("partner_email", normalizedEmail)
        .eq("status", "pending")
        .limit(1);

      if (!invites || invites.length === 0) {
        setStatus("no-invite");
        return;
      }

      // Get the inviter's username from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", invites[0].invited_by)
        .single();

      setInviterName(profile?.username ?? "Your partner");
      setDisplayName(invites[0].partner_name ?? profile?.username ?? normalizedEmail.split("@")[0]);

      // Check if the current user is already signed in with matching email
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && user.email?.toLowerCase() === normalizedEmail) {
        // Already signed in — accept the invite immediately
        await acceptInvite(normalizedEmail);
        setStatus("connected");
        return;
      }

      setStatus("signed-out");
    };

    void check();
  }, [router.isReady, router.query]);

  const acceptInvite = async (email: string) => {
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("partner_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("partner_email", email)
      .eq("status", "pending");
  };

  const handleAccept = async () => {
    if (!supabase || !hasSupabaseConfig) {
      setStatus("error");
      return;
    }

    setStatus("sending");

    const { error } = await supabase.auth.signInWithOtp({
      email: partnerEmail,
      options: {
        emailRedirectTo: buildRedirectTo(),
        shouldCreateUser: true,
        data: {
          username: displayName,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setStatus("signed-out");
      return;
    }

    setStatus("sent");
    toast.success("Magic link sent to your email!");
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <>
      <Head>
        <title>Open When | Join your partner</title>
      </Head>

      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[1.5rem] border border-[rgba(238,195,210,0.6)] bg-[rgba(255,252,251,0.96)] p-6 text-center shadow-[0_24px_48px_rgba(71,27,48,0.12)]">
          {status === "loading" ? (
            <div className="py-8">
              <Heart size={32} className="mx-auto animate-pulse text-[#8a3554]" fill="currentColor" />
              <p className="mt-4 text-sm font-semibold text-[#7f465b]">Checking your invitation...</p>
            </div>
          ) : status === "signed-out" ? (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#8a3554]">
                <Heart size={24} className="text-[#fddce7]" fill="currentColor" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                You&rsquo;re invited
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#7f465b]">
                <strong className="text-[#5f2f43]">{inviterName}</strong> wants to share love letters with you on OpenWhen.
              </p>

              <div className="mt-5 rounded-2xl border border-[rgba(191,127,150,0.2)] bg-[rgba(255,242,245,0.5)] px-4 py-3 text-left">
                <div className="flex items-center gap-2 text-sm text-[#6a4050]">
                  <Mail size={14} className="shrink-0 text-[#8a3554]" />
                  <span className="text-xs text-[#936273]">{partnerEmail}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <AppButton onClick={handleAccept}>
                  Accept invitation
                </AppButton>
                <AppButton variant="ghost" onClick={() => router.push("/")}>
                  Maybe later
                </AppButton>
              </div>
            </>
          ) : status === "sending" ? (
            <div className="py-8">
              <Heart size={32} className="mx-auto animate-pulse text-[#8a3554]" fill="currentColor" />
              <p className="mt-4 text-sm font-semibold text-[#7f465b]">Sending magic link...</p>
            </div>
          ) : status === "sent" ? (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#8a3554]">
                <Mail size={24} className="text-[#fddce7]" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                Halfway there
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#7f465b]">
                We sent a magic link to{" "}
                <strong className="text-[#5f2f43]">{partnerEmail}</strong>.
                Click it to finish signing in and connect with {inviterName}.
              </p>
              <div className="mt-5 rounded-2xl border border-[rgba(191,127,150,0.2)] bg-[rgba(255,242,245,0.5)] px-4 py-3 text-left text-sm text-[#6a4050]">
                <p>Check your inbox (and spam). The link expires in 5 minutes.</p>
              </div>
            </>
          ) : status === "connected" ? (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#8a3554]">
                <Check size={24} className="text-[#fddce7]" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                You&rsquo;re connected
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#7f465b]">
                You and <strong className="text-[#5f2f43]">{inviterName}</strong> are now connected. You can send each other Open When letters.
              </p>
              <div className="mt-5">
                <AppButton onClick={handleGoToDashboard}>
                  Go to my dashboard
                </AppButton>
              </div>
            </>
          ) : status === "no-invite" ? (
            <>
              <h1 className="text-2xl font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                No invitation found
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#7f465b]">
                This invitation link doesn&rsquo;t match any pending invites. It may have been revoked or already accepted.
              </p>
              <div className="mt-5">
                <AppButton onClick={() => router.push("/")}>
                  Go home
                </AppButton>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                Something went wrong
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#7f465b]">
                We couldn&rsquo;t load your invitation. Please try again.
              </p>
              <div className="mt-5">
                <AppButton onClick={() => router.push("/")}>
                  Go home
                </AppButton>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}