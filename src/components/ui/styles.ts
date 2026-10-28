import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-amber-500 text-slate-900 hover:bg-amber-400 active:bg-amber-600",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100",
  ghost: "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
  danger: "bg-red-600 text-white hover:bg-red-500 active:bg-red-700",
};

/** Kelas tombol. Dipakai bersama oleh <button>, <Link>, dan komponen client. */
export function buttonClass(variant: ButtonVariant = "secondary", size: "md" | "sm" = "md"): string {
  return clsx(BUTTON_BASE, BUTTON_VARIANT[variant], size === "md" ? "h-10 px-4 text-sm" : "h-9 px-3 text-sm");
}

/** Kelas bersama untuk <input>, <select>, dan <textarea>. `text-base` di HP mencegah iOS memperbesar layar saat fokus. */
export const inputClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 sm:text-sm " +
  "focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 " +
  "aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/20 disabled:bg-slate-100";
