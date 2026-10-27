import { Bell } from "lucide-react";
import { ROLE_LABEL, type SessionUser } from "@/lib/session";
import { Brand } from "./brand";

type HeaderProps = {
  user: SessionUser;
  appName: string;
  companyName: string;
  /** Jumlah notifikasi belum dibaca. Lencana disembunyikan saat 0. */
  unreadCount?: number;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function Header({ user, appName, companyName, unreadCount = 0 }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-shell text-white">
      <div className="flex h-(--height-header) items-center justify-between gap-3 px-4 lg:px-8">
        {/* HP: tampilkan merek karena sidebar disembunyikan. Desktop: nama perusahaan saja. */}
        <div className="min-w-0 lg:hidden">
          <Brand appName={appName} companyName={companyName} />
        </div>
        <p className="hidden truncate text-sm text-slate-300 lg:block">{companyName}</p>

        <div className="flex items-center gap-1 sm:gap-3">
          <button
            type="button"
            aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : "Notifikasi"}
            className="relative flex size-10 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Bell aria-hidden="true" className="size-5" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-4 text-slate-900"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-3 pl-1">
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white"
            >
              {initials(user.name)}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-medium">{user.name}</span>
              <span className="block text-xs text-slate-400">{ROLE_LABEL[user.role]}</span>
            </span>
          </div>
        </div>
      </div>
      {/* Garis belang hanya di HP; di desktop sudah ada di sidebar. */}
      <div className="hazard-stripe lg:hidden" aria-hidden="true" />
    </header>
  );
}
