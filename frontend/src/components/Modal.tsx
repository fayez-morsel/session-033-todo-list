import { X } from "lucide-react";
import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  actions,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {actions && (
          <div className="flex justify-end gap-3 rounded-b-3xl border-t border-gray-100 bg-gray-50 px-6 py-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
