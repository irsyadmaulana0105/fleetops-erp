import { Forklift } from "lucide-react";

type BrandProps = {
  appName: string;
  companyName: string;
};

/** Logo + nama aplikasi. Dipakai di sidebar (desktop) dan header (HP). */
export function Brand({ appName, companyName }: BrandProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-900"
      >
        <Forklift className="size-5" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold text-white">{appName}</span>
        <span className="block truncate text-xs text-slate-400">{companyName}</span>
      </span>
    </div>
  );
}
