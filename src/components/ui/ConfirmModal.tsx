import { Heart, LogOut, X } from "lucide-react";
import AppButton from "@/components/ui/AppButton";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Yes, sign out",
  cancelLabel = "Stay",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#3d2030]/35 px-4 py-4 backdrop-blur-sm md:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[1.5rem] border border-[rgba(238,195,210,0.6)] bg-[linear-gradient(180deg,rgba(255,252,251,0.98),rgba(255,244,247,0.96))] p-5 shadow-[0_24px_48px_rgba(71,27,48,0.18)] md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgba(138,53,84,0.1)]">
              <LogOut size={18} className="text-[#8a3554]" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a3554]">
                {title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-full px-3 py-1 text-sm font-semibold text-[#7f465b] transition hover:bg-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-[#7f465b]">{message}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <AppButton onClick={onConfirm}>
            <LogOut size={15} />
            {confirmLabel}
          </AppButton>
          <AppButton variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </AppButton>
        </div>
      </div>
    </div>
  );
}