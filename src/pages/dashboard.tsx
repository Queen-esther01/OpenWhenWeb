import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Heart,
  LogOut,
  PenLine,
  Plus,
  Sparkles,
  User,
  UserCheck,
  Clock,
} from "lucide-react";
import { supabase, hasSupabaseConfig } from "@/lib/supabaseClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import InvitePartnerModal from "@/components/onboarding/InvitePartnerModal";
import CreateLetterWorkflowModal from "@/components/onboarding/CreateLetterWorkflowModal";
import AppButton from "@/components/ui/AppButton";
import ConfirmModal from "@/components/ui/ConfirmModal";

type OpenWhenLetter = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  title: string;
  content: string;
  opens_at: string | null;
  is_locked: boolean;
  created_at: string;
  status: string;
  read_at: string | null;
  category_id: string | null;
  sound_id: string | null;
  voice_id: string | null;
};

type PartnerInvite = {
  partner_name: string | null;
  partner_email: string;
  status: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [letters, setLetters] = useState<OpenWhenLetter[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [draftToEdit, setDraftToEdit] = useState<OpenWhenLetter | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [username, setUsername] = useState("");
  const [partnerInvite, setPartnerInvite] = useState<PartnerInvite | null>(null);

  const fetchLetters = async (currentUserId: string) => {
    if (!supabase) return;

    const { data: userLetters } = await supabase
      .from("open_when_letters")
      .select("id, sender_id, recipient_id, title, content, opens_at, is_locked, created_at, status, read_at, category_id, sound_id, voice_id")
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (userLetters) {
      setLetters(userLetters);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (!hasSupabaseConfig || !supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      console.log("Current user:", currentUser);

      if (!currentUser) {
        await router.replace("/");
        return;
      }

      setUser(currentUser);
      setUsername(
        (currentUser.user_metadata?.username as string) ??
          currentUser.email?.split("@")[0] ??
          "darling",
      );

      let finalPartnerInvite: PartnerInvite | null = null;

      // Fetch partner invites I sent
      const { data: sentInvites } = await supabase
        .from("partner_invites")
        .select("partner_name, partner_email, status")
        .eq("invited_by", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(1);
      console.log("Sent invites:", sentInvites);

      if (sentInvites && sentInvites.length > 0) {
        finalPartnerInvite = sentInvites[0];
      }

      // Check if I was invited by someone (I'm the partner)
      const { data: receivedInvites } = await supabase
        .from("partner_invites")
        .select("invited_by, partner_email, status")
        .eq("partner_email", currentUser.email?.toLowerCase() ?? "") // currentUser.email?.toLowerCase() ?? "")
        .in("status", ["accepted", "pending"])
        .order("created_at", { ascending: false })
        .limit(1);
      console.log('currentUser.email:', currentUser.email?.toLowerCase());
      console.log("Received invites:", receivedInvites);

      if (receivedInvites && receivedInvites.length > 0) {
        const response = await fetch("/api/invite-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invitedBy: receivedInvites[0].invited_by,
            partnerEmail: receivedInvites[0].partner_email,
          }),
        });

        const inviteDetails = (await response.json()) as
          | {
              success: true;
              inviterEmail: string | null;
              inviterName: string;
              partnerEmail: string;
              status: string;
            }
          | { error: string };

        if ("success" in inviteDetails) {
          finalPartnerInvite = {
            partner_name: inviteDetails.inviterName,
            partner_email: inviteDetails.inviterEmail ?? receivedInvites[0].partner_email,
            status: inviteDetails.status,
          };
        }
      }

      setPartnerInvite(finalPartnerInvite);

      const hasPartner = finalPartnerInvite !== null;

      // Show invite modal on first visit only if they don't already have a partner
      if (currentUser.user_metadata?.onboarded === false && !hasPartner) {
        setShowInviteModal(true);
        await supabase.auth.updateUser({
          data: { onboarded: true },
        });
      } else if (currentUser.user_metadata?.onboarded === false) {
        // Still mark as onboarded so it doesn't show next time
        await supabase.auth.updateUser({
          data: { onboarded: true },
        });
      }

      // Fetch existing letters
      await fetchLetters(currentUser.id);

      setLoading(false);
    };

    void checkAuth();
  }, [router]);

  useEffect(() => {
    if (router.query.compose === "1" && user) {
      setShowCreateWorkflow(true);
    }
  }, [router.query.compose, user]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    await router.replace("/");
  };

  console.log("Partner invite:", partnerInvite);
  const partnerDisplayName = partnerInvite?.partner_name ?? partnerInvite?.partner_email.split("@")[0] ?? null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Heart
            size={32}
            className="mx-auto animate-pulse text-[#8a3554]"
            fill="currentColor"
          />
          <p className="mt-4 text-sm font-semibold text-[#7f465b]">
            Loading your love space...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentUserId = user.id;
  const myLetters = letters.filter((letter) => letter.sender_id === currentUserId);
  const receivedLetters = letters.filter(
    (letter) => letter.recipient_id === currentUserId && letter.sender_id !== currentUserId,
  );

  return (
    <>
      <Head>
        <title>Open When | {username}'s love space</title>
      </Head>

      <div className="min-h-screen px-4 py-6 md:px-6 md:py-10">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#8a3554]">
                <Heart size={14} fill="currentColor" /> Open When
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[rgba(119,69,88,0.3)] bg-transparent px-3 py-2 text-xs font-bold text-[#774558] transition hover:bg-[rgba(255,255,255,0.6)]"
              >
                <User size={14} />
                {partnerInvite ? (partnerInvite.status === "accepted" ? "Connected" : "Invited") : "Partner"}
              </button>
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(true)}
                className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border border-[rgba(119,69,88,0.3)] bg-transparent px-3 py-2 text-xs font-bold text-[#774558] transition hover:bg-[rgba(255,255,255,0.6)]"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </header>
          <div className="mt-6">
            <h1 className="mt-2 text-3xl font-bold leading-tight text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif] md:text-4xl">
                Welcome back, {username}
              </h1>
              <p className="mt-1 text-sm text-[#7f465b]">
                Your love letters, waiting for the right moment.
              </p>
          </div>

          {/* Partner status card */}
          {partnerInvite ? (
            <section className="mt-6 rounded-[1.2rem] border border-[rgba(191,127,150,0.2)] bg-[rgba(255,252,251,0.7)] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgba(138,53,84,0.1)]">
                  {partnerInvite.status === "accepted" ? (
                    <UserCheck size={16} className="text-[#8a3554]" />
                  ) : (
                    <Clock size={16} className="text-[#8a3554]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#5f2f43]">
                    {partnerDisplayName ?? "Your partner"}
                  </p>
                  <p className="text-xs text-[#936273]">
                    {partnerInvite.status === "accepted"
                      ? "Connected"
                      : partnerInvite.status === "pending"
                        ? "Invitation sent — waiting for them to join"
                        : "Invitation declined"}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {/* Primary create action */}
          <section className="mt-6 rounded-3xl border border-[rgba(238,195,210,0.6)] bg-[linear-gradient(135deg,rgba(255,237,240,0.9),rgba(255,242,238,0.85))] p-6 shadow-[0_12px_28px_rgba(128,63,89,0.08)] md:p-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                  Write a new letter
                </h2>
                <p className="mt-1 text-sm text-[#7f465b]">
                  For a feeling, a moment, or a day you know is coming.
                </p>
              </div>
              <AppButton onClick={() => setShowCreateWorkflow(true)}>
                <PenLine size={16} />
                &nbsp;Create Open When
              </AppButton>
            </div>
          </section>

          {/* Your letters */}
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                Your letters
              </h2>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8a3554]">
                {myLetters.length} letter{myLetters.length !== 1 ? "s" : ""}
              </span>
            </div>

            {myLetters.length === 0 ? (
              <div className="mt-4 rounded-[1.2rem] border border-[rgba(191,127,150,0.2)] bg-[rgba(255,252,251,0.7)] px-5 py-10 text-center">
                <Sparkles
                  size={28}
                  className="mx-auto text-[#c15e7f]"
                  aria-hidden="true"
                />
                <p className="mt-3 text-base font-semibold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                  No letters yet
                </p>
                <p className="mt-1 text-sm text-[#7f465b]">
                  Start a draft or send a letter and it will appear here.
                </p>
                <div className="mt-4">
                  <AppButton onClick={() => setShowCreateWorkflow(true)}>
                    <Plus size={16} />
                    &nbsp;Create your first letter
                  </AppButton>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myLetters.map((letter) => (
                  <div
                    key={letter.id}
                    className="group rounded-[1.2rem] border border-[rgba(191,127,150,0.25)] bg-[rgba(255,252,251,0.85)] p-4 shadow-[0_4px_12px_rgba(128,63,89,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(128,63,89,0.1)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                        {letter.title}
                      </h3>
                      {letter.status === "draft" ? (
                        <span className="shrink-0 rounded-full bg-[rgba(143,74,99,0.1)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[#8a3554]">
                          Draft
                        </span>
                      ) : (
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="rounded-full bg-[rgba(138,53,84,0.08)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[#8a3554]">
                            Sent
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] ${letter.read_at ? "bg-[rgba(86,143,100,0.12)] text-[#467257]" : "bg-[rgba(143,74,99,0.08)] text-[#8a3554]"}`}>
                            {letter.read_at ? "Read" : "Unread"}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-[#936273]">
                      {letter.status === "draft"
                        ? "Saved draft"
                        : letter.read_at
                          ? `Opened ${new Date(letter.read_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}`
                          : "Sent letter"}
                    </p>
                    <p className="mt-1 text-[0.65rem] text-[#b08d99]">
                      Created {new Date(letter.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {letter.status === "draft" ? (
                      <div className="mt-4">
                        <AppButton
                          type="button"
                          onClick={() => {
                            setDraftToEdit(letter);
                            setShowCreateWorkflow(true);
                          }}
                        >
                          Continue working
                        </AppButton>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Letters received */}
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                Letters received
              </h2>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8a3554]">
                {receivedLetters.length} letter{receivedLetters.length !== 1 ? "s" : ""}
              </span>
            </div>

            {receivedLetters.length === 0 ? (
              <div className="mt-4 rounded-[1.2rem] border border-[rgba(191,127,150,0.2)] bg-[rgba(255,252,251,0.7)] px-5 py-10 text-center">
                <Heart
                  size={28}
                  className="mx-auto text-[#c15e7f]"
                  fill="currentColor"
                  aria-hidden="true"
                />
                <p className="mt-3 text-base font-semibold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                  No received letters yet
                </p>
                <p className="mt-1 text-sm text-[#7f465b]">
                  When your partner sends you a letter, it will appear here.
                </p>
                {partnerInvite?.status === "accepted" ? null : (
                  <div className="mt-4">
                    <AppButton variant="link" onClick={() => setShowInviteModal(true)}>
                      Invite your partner
                    </AppButton>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {receivedLetters.map((letter) => (
                  <div
                    key={letter.id}
                    className="group cursor-pointer rounded-[1.2rem] border border-[rgba(191,127,150,0.25)] bg-[rgba(255,252,251,0.85)] p-4 shadow-[0_4px_12px_rgba(128,63,89,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(128,63,89,0.1)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                        {letter.title}
                      </h3>
                      <span className="shrink-0 rounded-full bg-[rgba(138,53,84,0.08)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[#8a3554]">
                        Received
                      </span>
                    </div>
                    {letter.opens_at ? (
                      <p className="mt-2 text-xs text-[#936273]">
                        Opens{" "}
                        {new Date(letter.opens_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-[#936273]">Ready to open</p>
                    )}
                    <p className="mt-1 text-[0.65rem] text-[#b08d99]">
                      Created{" "}
                      {new Date(letter.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="mt-12 border-t border-[rgba(191,127,150,0.15)] pt-6 text-center">
            <p className="text-xs text-[#b08d99]">
              Made with intention for the ones we love.
            </p>
          </footer>
        </div>
      </div>

      <InvitePartnerModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSkip={() => setShowInviteModal(false)}
        onInviteSent={() => {
          // Re-fetch partner invite data after sending/revoking
          if (!supabase || !user) return;
          // Check both sent invites and received invites
          supabase
            .from("partner_invites")
            .select("partner_name, partner_email, status, invited_by")
            .or(`invited_by.eq.${user.id},partner_email.eq.${user.email?.toLowerCase() ?? ""}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .then(async ({ data }) => {
              if (data && data.length > 0) {
                const invite = data[0];
                // If this is a received invite (I'm the partner), fetch inviter's name
                if (invite.partner_email?.toLowerCase() === user.email?.toLowerCase()) {
                  const response = await fetch("/api/invite-details", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      invitedBy: invite.invited_by,
                      partnerEmail: invite.partner_email,
                    }),
                  });

                  const inviteDetails = (await response.json()) as
                    | {
                        success: true;
                        inviterEmail: string | null;
                        inviterName: string;
                        partnerEmail: string;
                        status: string;
                      }
                    | { error: string };

                  if ("success" in inviteDetails) {
                    setPartnerInvite({
                      partner_name: inviteDetails.inviterName,
                      partner_email: inviteDetails.inviterEmail ?? invite.partner_email,
                      status: inviteDetails.status,
                    });
                  }
                } else {
                  setPartnerInvite(invite);
                }
              }
            });
        }}
        existingInvite={partnerInvite}
      />

      <CreateLetterWorkflowModal
        open={showCreateWorkflow}
        onClose={() => {
          setShowCreateWorkflow(false);
          setDraftToEdit(null);
        }}
        initialDraft={draftToEdit}
        onDraftSaved={async () => {
          if (user) {
            await fetchLetters(user.id);
          }
        }}
      />

      <ConfirmModal
        open={showSignOutConfirm}
        title="Sign out"
        message="Are you sure you want to leave your love space? You can always sign back in with your email."
        confirmLabel="Yes, sign out"
        cancelLabel="Stay"
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </>
  );
}