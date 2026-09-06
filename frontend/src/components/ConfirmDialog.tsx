import { btn } from "../lib/ui";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-border-strong bg-surface p-5 shadow-2xl">
        <h3 className="text-base font-bold text-text">{title}</h3>
        <p className="text-sm text-muted mt-1">{message}</p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className={`flex-1 px-3 py-2 text-sm ${btn.secondary}`}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-3 py-2 text-sm ${danger ? btn.danger : btn.primary}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
