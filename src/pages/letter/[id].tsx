import { useEffect, useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";

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
    .select("id, title, content, opens_at, is_locked, status, read_at, sender_id, recipient_id")
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
      },
      canOpen,
      now,
    },
  };
};

export default function LetterPage({ letter, canOpen, now }: LetterPageProps) {
  const [currentNow, setCurrentNow] = useState(now);

  useEffect(() => {
    if (canOpen) return;

    const timer = window.setInterval(() => {
      setCurrentNow(new Date().toISOString());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [canOpen]);

  const liveCountdown = useMemo(() => formatCountdown(letter.opens_at, currentNow), [letter.opens_at, currentNow]);

  if (!canOpen) {
    return (
      <main className="min-h-screen bg-[#fff7fa] px-6 py-16 text-[#5f2f43]">
        <div className="mx-auto flex max-w-2xl flex-col items-center rounded-4xl border border-[rgba(238,195,210,0.7)] bg-white p-8 text-center shadow-[0_20px_60px_rgba(128,63,89,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a3554]">Locked note</p>
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
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a3554]">Open when</p>
        <h1 className="mt-4 text-4xl font-bold">{letter.title}</h1>
        <p className="mt-3 text-sm text-[#936273]">
          {letter.read_at ? "Read and opened." : "Opened now."}
        </p>
        <div className="mt-8 whitespace-pre-wrap rounded-3xl border border-[rgba(191,127,150,0.16)] bg-[#fff9fb] p-6 text-lg leading-8 text-[#5f2f43]">
          {letter.content}
        </div>
      </div>
    </main>
  );
}