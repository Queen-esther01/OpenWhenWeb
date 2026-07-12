import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase, hasSupabaseConfig } from "@/lib/supabaseClient";
import { useAcceptInvite, usePartnerOnboarded } from "@/lib/queries";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing your sign-in...");
  const acceptInviteMutation = useAcceptInvite();
  const partnerOnboardedMutation = usePartnerOnboarded();

  useEffect(() => {
    const completeAuth = async () => {
      if (!hasSupabaseConfig || !supabase) {
        setStatus("Missing Supabase env keys.");
        return;
      }

      const code =
        typeof router.query.code === "string" ? router.query.code : null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setStatus(error.message);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const username = user.user_metadata?.username as string | undefined;
        const userEmail = user.email;

        // Create the profile row if it doesn't exist yet
        if (username) {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          if (!existingProfile) {
            await supabase.from("profiles").insert({
              id: user.id,
              username: username.toLowerCase().trim(),
              display_name: username,
            });
          }
        }

        // Auto-accept any pending partner invites for this email
        if (userEmail) {
          try {
            const { accepted } = await acceptInviteMutation.mutateAsync({ email: userEmail });

            // Notify the inviter only the first time this invite is accepted.
            if (accepted) {
              await partnerOnboardedMutation.mutateAsync({ partnerEmail: userEmail });
            }
          } catch {
            // Ignore errors - the invite will still show as pending
          }
        }

        // Mark the user as needing onboarding (first visit)
        if (!user.user_metadata?.onboarded) {
          await supabase.auth.updateUser({
            data: { onboarded: false },
          });
        }
      }

      await router.replace("/dashboard");
    };

    if (router.isReady) {
      void completeAuth();
    }
  }, [acceptInviteMutation, partnerOnboardedMutation, router]);

  return (
    <>
      <Head>
        <title>Open When | Completing sign in</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="max-w-md rounded-3xl border border-[rgba(238,195,210,0.7)] bg-[rgba(255,252,251,0.96)] p-6 text-center shadow-[0_24px_48px_rgba(71,27,48,0.12)]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a3554]">
            Magic link
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
            {status}
          </h1>
        </div>
      </main>
    </>
  );
}