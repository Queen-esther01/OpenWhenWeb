import type { ButtonHTMLAttributes, ReactNode } from "react";

type AppButtonProps = {
  children: ReactNode;
  variant?: "primary" | "ghost" | "link";
} & ButtonHTMLAttributes<HTMLButtonElement>;

const baseButtonClass =
  "inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-extrabold transition duration-150 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none";

export default function AppButton({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...buttonProps
}: AppButtonProps) {
  if (variant === "link") {
    return (
      <button
        type={type}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-transparent px-2 py-2 text-sm font-bold text-[#744356] transition duration-150 hover:bg-[rgba(255,255,255,0.5)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent ${className}`}
        {...buttonProps}
      >
        {children}
      </button>
    );
  }

  if (variant === "ghost") {
    return (
      <button
        type={type}
        className={`${baseButtonClass} cursor-pointer border-[rgba(119,69,88,0.3)] bg-transparent text-[#774558] hover:bg-[rgba(255,255,255,0.6)] disabled:bg-[rgba(255,255,255,0.35)] disabled:text-[#a98a95] disabled:hover:bg-[rgba(255,255,255,0.35)] ${className}`}
        {...buttonProps}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type={type}
      className={`${baseButtonClass} cursor-pointer border-transparent bg-[#8b3a57] text-[#fff6fb] hover:-translate-y-0.5 hover:bg-[#7a304b] hover:shadow-[0_8px_14px_rgba(122,48,75,0.2)] disabled:translate-y-0 disabled:bg-[#c98ea6] disabled:text-[#fff3f8] disabled:hover:shadow-none ${className}`}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
