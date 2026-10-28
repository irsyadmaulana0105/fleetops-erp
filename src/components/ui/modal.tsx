"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * Dialog modal memakai elemen <dialog> bawaan browser: fokus terkunci di dalam dialog,
 * Escape menutup, dan latar di belakangnya tidak bisa diklik — tanpa perlu menulis ulang semuanya.
 * Di HP tampil sebagai lembar dari bawah; di layar lebar sebagai dialog di tengah.
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Cegah halaman di belakang ikut ter-scroll saat dialog terbuka.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // `close` dipicu Escape maupun dialog.close(); sinkronkan state induk.
      onClose={onClose}
      // Klik pada latar (elemen <dialog> itu sendiri, bukan isinya) menutup dialog.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 sm:m-auto sm:max-h-[90dvh] sm:max-w-lg sm:rounded-2xl"
    >
      <div className="flex max-h-[92dvh] flex-col sm:max-h-[90dvh]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-sm text-slate-600">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
