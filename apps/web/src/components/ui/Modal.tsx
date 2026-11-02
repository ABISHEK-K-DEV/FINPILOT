import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Accessible dialog built on <dialog>: focus trapping, Esc to close, bottom sheet on mobile. */
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-2xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/40 sm:m-auto sm:max-w-lg sm:rounded-2xl"
      aria-labelledby="modal-title"
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="modal-title" className="text-base font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-3 hover:bg-canvas hover:text-ink" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
