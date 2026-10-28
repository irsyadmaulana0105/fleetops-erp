import clsx from "clsx";
import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-900 ring-amber-300",
  danger: "bg-red-50 text-red-700 ring-red-200",
};

/** Lencana status. Warna selalu disertai teks, jadi tidak bergantung pada kemampuan membedakan warna. */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE[tone],
      )}
    >
      {children}
    </span>
  );
}
