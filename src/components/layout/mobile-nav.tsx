"use client";

import clsx from "clsx";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { isActivePath, navForRole, type RoleName } from "@/lib/nav";
import { Brand } from "./brand";

type MobileNavProps = {
  role: RoleName;
  appName: string;
  companyName: string;
};

/**
 * Navigasi HP & tablet (< 1024px): bottom bar berisi menu utama,
 * dan tombol "Menu" yang membuka lembar berisi seluruh menu.
 */
export function MobileNav({ role, appName, companyName }: MobileNavProps) {
  const pathname = usePathname();
  const groups = navForRole(role);
  const primary = groups.flatMap((g) => g.items).filter((i) => i.primary);

  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Tutup lembar setiap kali pindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Saat terbuka: kunci scroll latar, fokus ke tombol tutup, Escape menutup, Tab dijaga di dalam lembar.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <>
      <nav
        aria-label="Menu utama"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-shell lg:hidden"
      >
        <ul className="flex h-(--height-bottom-nav) items-stretch justify-around">
          {primary.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                    active ? "text-amber-500" : "text-slate-400 active:text-white",
                  )}
                >
                  <Icon aria-hidden="true" className="size-6" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs font-medium text-slate-400 transition-colors active:text-white"
            >
              <Menu aria-hidden="true" className="size-6" />
              Menu
            </button>
          </li>
        </ul>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60" onClick={close} aria-hidden="true" />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Semua menu"
            className="pb-safe absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-shell shadow-2xl"
          >
            <div className="sticky top-0 flex items-center justify-between bg-shell px-4 py-3">
              <Brand appName={appName} companyName={companyName} />
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Tutup menu"
                className="flex size-10 items-center justify-center rounded-full text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <div className="hazard-stripe" aria-hidden="true" />

            <div className="space-y-6 px-3 py-5">
              {groups.map((group) => (
                <section key={group.title}>
                  <h2 className="mb-2 px-3 text-xs font-medium text-slate-500">{group.title}</h2>
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
                              "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium",
                              active ? "bg-slate-800 text-white" : "text-slate-300 active:bg-slate-800/60",
                            )}
                          >
                            <Icon
                              aria-hidden="true"
                              className={clsx("size-5 shrink-0", active ? "text-amber-500" : "text-slate-400")}
                            />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
