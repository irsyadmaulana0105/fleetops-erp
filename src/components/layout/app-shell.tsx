import type { ReactNode } from "react";
import type { SessionUser } from "@/lib/session";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

type AppShellProps = {
  user: SessionUser;
  children: ReactNode;
};

/**
 * Kerangka dashboard.
 *  - ≥ 1024px : sidebar tetap di kiri + header di atas konten.
 *  - < 1024px : header ringkas di atas + bottom navigation (PWA di HP mekanik).
 */
export function AppShell({ user, children }: AppShellProps) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "FleetOps ERP";
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "PT Forklift Solusindo Utama";

  return (
    <div className="min-h-dvh lg:pl-(--width-sidebar)">
      <a
        href="#konten-utama"
        className="sr-only z-50 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Lewati ke konten
      </a>

      <Sidebar role={user.role} appName={appName} companyName={companyName} />
      <Header user={user} appName={appName} companyName={companyName} />

      <main
        id="konten-utama"
        className="mx-auto w-full max-w-6xl px-4 pb-[calc(var(--height-bottom-nav)+env(safe-area-inset-bottom)+1.5rem)] pt-6 lg:px-8 lg:pb-10 lg:pt-8"
      >
        {children}
      </main>

      <MobileNav role={user.role} appName={appName} companyName={companyName} />
    </div>
  );
}
