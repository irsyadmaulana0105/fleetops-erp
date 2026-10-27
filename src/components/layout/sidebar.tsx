"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, navForRole, type RoleName } from "@/lib/nav";
import { Brand } from "./brand";

type SidebarProps = {
  role: RoleName;
  appName: string;
  companyName: string;
};

/** Navigasi utama untuk layar lebar (≥ 1024px). Disembunyikan di HP. */
export function Sidebar({ role, appName, companyName }: SidebarProps) {
  const pathname = usePathname();
  const groups = navForRole(role);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--width-sidebar) flex-col bg-shell lg:flex">
      <div className="flex h-(--height-header) items-center px-4">
        <Brand appName={appName} companyName={companyName} />
      </div>
      <div className="hazard-stripe" aria-hidden="true" />

      <nav aria-label="Menu utama" className="flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.title} className="mb-6 last:mb-0">
            <p className="mb-2 px-3 text-xs font-medium text-slate-500">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-slate-800 text-white"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white",
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className={clsx("size-5 shrink-0", active ? "text-amber-500" : "text-slate-400 group-hover:text-slate-200")}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
