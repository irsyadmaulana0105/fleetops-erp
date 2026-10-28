"use client";

import clsx from "clsx";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastType = "success" | "error";
type Toast = { id: number; type: ToastType; message: string };

type ToastApi = {
  show: (toast: { type: ToastType; message: string }) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const DISMISS_AFTER_MS = 5000;

/** Notifikasi singkat (sukses / gagal) di pojok layar. Di HP muncul di atas bottom navigation. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (toast: { type: ToastType; message: string }) => {
      const id = nextId.current++;
      // Maksimal 3 notifikasi tampil sekaligus agar tidak menumpuk menutupi isi halaman di HP.
      setToasts((current) => [...current, { id, ...toast }].slice(-3));
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--height-bottom-nav)+env(safe-area-inset-bottom)+0.75rem)] z-[60] flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ring-1",
              toast.type === "success"
                ? "bg-slate-900 text-white ring-slate-700"
                : "bg-red-50 text-red-900 ring-red-200",
            )}
          >
            {toast.type === "success" ? (
              <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-400" />
            ) : (
              <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-600" />
            )}
            <p className="min-w-0 flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Tutup notifikasi"
              className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded-full opacity-70 hover:opacity-100"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast harus dipakai di dalam <ToastProvider>.");
  return context;
}
