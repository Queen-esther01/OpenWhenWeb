import type { ReactNode } from "react";

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  children: ReactNode;
};

export default function FeatureCard({
  icon,
  title,
  children,
}: FeatureCardProps) {
  return (
    <article className="col-span-12 rounded-[1.2rem] border border-[rgba(224,170,190,0.5)] bg-[rgba(255,249,248,0.88)] p-[1.2rem] shadow-[0_8px_20px_rgba(131,63,88,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(131,63,88,0.08)] md:col-span-4 max-[520px]:p-4">
      <div className="text-(--rose-700)">{icon}</div>
      <h2 className="mt-[0.85rem] mb-2 text-[1.55rem] leading-[1.15] text-[#5a2f40] [font-family:var(--font-romantic-serif),Georgia,Times_New_Roman,serif]">
        {title}
      </h2>
      <p className="m-0 leading-[1.68] text-(--ink-soft)">{children}</p>
    </article>
  );
}
