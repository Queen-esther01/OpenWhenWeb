import { useState } from "react";
import { Heart, Mail, RefreshCw, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import AppButton from "@/components/ui/AppButton";
import { supabase, hasSupabaseConfig } from "@/lib/supabaseClient";
import { useInvitePartner } from "@/lib/queries";

type InvitePartnerModalProps = {
  open: boolean;
  onClose: () => void;
  onSkip: () => void;
  onInviteSent?: () => void;
  existingInvite?: {
    partner_name: string | null;
    partner_email: string;
    status: string;
  } | null;
};

export default function InvitePartnerModal({
  open,
  onClose,
  onSkip,
  onInviteSent,
  existingInvite,
}: InvitePartnerModalProps) {
  const [partnerEmail, setPartnerEmail] = useState(existingInvite?.partner_email ?? "");
  const [partnerName, setPartnerName] = useState(existingInvite?.partner_name ?? "");
  const [message, setMessage] = useState("");
  const [invited, setInvited] = useState(false);
  const inviteMutation = useInvitePartner();
  const [isRevoking, setIsRevoking] = useState(false);

  if (!open) {
    return null;
  }

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !hasSupabaseConfig) {
      setMessage("Supabase is not configured yet.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You need to be signed in first.");
      return;
    }

    setMessage("");

    const normalizedEmail = partnerEmail.trim().toLowerCase();
    const senderName =
      (user.user_metadata?.username as string) ??
      user.email?.split("@")[0] ??
      "Your partner";

    // Insert or update the partner invitation in the database
    if (existingInvite && existingInvite.status === "pending") {
      const { error } = await supabase
        .from("partner_invites")
        .update({
          partner_name: partnerName.trim() || null,
          status: "pending",
        })
        .eq("partner_email", normalizedEmail)
        .eq("invited_by", user.id);

      if (error) {
        setMessage(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("partner_invites").insert({
        invited_by: user.id,
        partner_email: normalizedEmail,
        partner_name: partnerName.trim() || null,
        status: "pending",
      });

      if (error) {
        setMessage(error.message);
        return;
      }
    }

    // Send the invitation email via Resend
    inviteMutation.mutate(
      {
        partnerEmail: normalizedEmail,
        partnerName: partnerName.trim() || null,
        senderName,
      },
      {
        onSuccess: () => {
          setInvited(true);
          setMessage(`Invitation sent to ${normalizedEmail}.`);
          toast.success("Invitation sent!");
          onInviteSent?.();
        },
        onError: (err) => {
          setMessage(err?.toString() ?? "Invite saved but email failed to send.");
          setInvited(true);
          onInviteSent?.();
        },
      },
    );
  };

  const handleRevoke = async () => {
    if (!supabase || !existingInvite) return;

    setIsRevoking(true);
    const normalizedEmail = existingInvite.partner_email.toLowerCase();

    const { error } = await supabase
      .from("partner_invites")
      .update({ status: "declined" })
      .eq("partner_email", normalizedEmail);

    setIsRevoking(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    toast.success("Invitation revoked.");
    onInviteSent?.();
    onSkip();
  };

  const handleSkip = () => {
    setPartnerEmail("");
    setPartnerName("");
    setMessage("");
    setInvited(false);
    onSkip();
  };

  // Show existing invite info with resend/revoke
  if (existingInvite && !invited) {
    const displayName = existingInvite.partner_name ?? existingInvite.partner_email.split("@")[0] ?? "Your partner";

    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-[#3d2030]/35 px-4 py-4 backdrop-blur-sm md:items-center"
        onClick={handleSkip}
      >
        <div
          className="w-full max-w-lg rounded-[1.5rem] border border-[rgba(238,195,210,0.6)] bg-[linear-gradient(180deg,rgba(255,252,251,0.98),rgba(255,244,247,0.96))] p-5 shadow-[0_24px_48px_rgba(71,27,48,0.18)] md:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#8a3554]">
                <Heart size={18} className="text-[#fddce7]" fill="currentColor" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a3554]">
                  Your love space
                </p>
                <h2 className="text-xl font-bold leading-tight text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                  Partner invitation
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="cursor-pointer rounded-full px-3 py-1 text-sm font-semibold text-[#7f465b] transition hover:bg-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-[rgba(191,127,150,0.2)] bg-[rgba(255,255,255,0.65)] px-4 py-5 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[rgba(138,53,84,0.1)]">
              <Heart size={22} className="text-[#8a3554]" fill="currentColor" />
            </div>
            <p className="mt-3 text-base font-semibold text-[#5f2f43]">
              {displayName}
            </p>
            <p className="mt-1 text-xs text-[#936273]">{existingInvite.partner_email}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#8a3554]">
              {existingInvite.status === "accepted" ? "Connected" : "Invitation pending"}
            </p>
          </div>

          {existingInvite.status === "pending" ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <AppButton onClick={() => handleInvite({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>)}>
                <RefreshCw size={15} />&nbsp;Resend invite
              </AppButton>
              <AppButton variant="ghost" onClick={handleRevoke}>
                {isRevoking ? "Revoking..." : <><Trash2 size={15} />&nbsp;Revoke invitation</>}
              </AppButton>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#3d2030]/35 px-4 py-4 backdrop-blur-sm md:items-center"
      onClick={handleSkip}
    >
      <div
        className="w-full max-w-lg rounded-[1.5rem] border border-[rgba(238,195,210,0.6)] bg-[linear-gradient(180deg,rgba(255,252,251,0.98),rgba(255,244,247,0.96))] p-5 shadow-[0_24px_48px_rgba(71,27,48,0.18)] md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#8a3554]">
              <Heart size={18} className="text-[#fddce7]" fill="currentColor" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a3554]">
                Your love space
              </p>
              <h2 className="text-xl font-bold leading-tight text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                {invited ? "Invitation sent" : "Invite your partner"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="cursor-pointer rounded-full px-3 py-1 text-sm font-semibold text-[#7f465b] transition hover:bg-white"
          >
            <X size={18} />
          </button>
        </div>

        {invited ? (
          <div className="mt-6 text-center">
            <div className="rounded-2xl border border-[rgba(143,74,99,0.2)] bg-[rgba(255,255,255,0.65)] px-4 py-6">
              <Heart
                size={32}
                className="mx-auto text-[#8a3554]"
                fill="currentColor"
              />
              <p className="mt-3 text-lg font-semibold text-[#5f2f43] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
                Your invitation is on its way
              </p>
              <p className="mt-1 text-sm text-[#6a4050]">
                When they join, you&rsquo;ll both be able to send and receive Open
                When letters.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <AppButton onClick={handleSkip}>
                Go to my dashboard
              </AppButton>
            </div>
          </div>
        ) : (
          <form className="mt-5 grid gap-4" onSubmit={handleInvite}>
            <p className="text-sm leading-6 text-[#7f465b]">
              Open When is better together. Invite the person you love, so you
              can send each other letters.
            </p>

            <label className="grid gap-2 text-sm font-semibold text-[#6a4050]">
              Their name (optional)
              <span className="flex items-center gap-2 rounded-2xl border border-[rgba(191,127,150,0.28)] bg-white px-3 py-3">
                <Heart
                  size={16}
                  className="text-[#8a3554] shrink-0"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={partnerName}
                  onChange={(event) => setPartnerName(event.target.value)}
                  placeholder="e.g. Alex"
                  autoComplete="off"
                  className="w-full border-0 bg-transparent outline-none placeholder:text-[#b08d99]"
                />
              </span>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#6a4050]">
              Their email
              <span className="flex items-center gap-2 rounded-2xl border border-[rgba(191,127,150,0.28)] bg-white px-3 py-3">
                <Mail
                  size={16}
                  className="text-[#8a3554] shrink-0"
                  aria-hidden="true"
                />
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={(event) => setPartnerEmail(event.target.value)}
                  placeholder="partner@example.com"
                  autoComplete="email"
                  className="w-full border-0 bg-transparent outline-none placeholder:text-[#b08d99]"
                />
              </span>
            </label>

            {message ? (
              <p className="rounded-2xl border border-[rgba(143,74,99,0.2)] bg-[rgba(255,255,255,0.65)] px-3 py-3 text-sm font-medium text-[#6a4050]">
                {message}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <AppButton type="submit" disabled={inviteMutation.isPending || !partnerEmail.trim()}>
                {inviteMutation.isPending ? "Sending..." : "Send invite"}
              </AppButton>
              <AppButton variant="ghost" onClick={handleSkip}>
                Skip for now
              </AppButton>
            </div>
          </form>
        )}

        {!hasSupabaseConfig ? (
          <p className="mt-3 text-xs leading-5 text-[#936273]">
            Add Supabase env keys to enable partner invitations.
          </p>
        ) : null}
      </div>
    </div>
  );
}