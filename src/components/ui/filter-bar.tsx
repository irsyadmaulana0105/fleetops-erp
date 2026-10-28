import Link from "next/link";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClass, inputClass } from "./styles";

type FilterBarProps = {
  basePath: string;
  query: string;
  searchPlaceholder: string;
  /** Filter tambahan (mis. <select name="category">). Harus berupa elemen form biasa. */
  children?: ReactNode;
  hasActiveFilters: boolean;
};

/**
 * Pencarian & filter lewat <form method="get">: bekerja tanpa JavaScript, URL bisa dibagikan,
 * dan hasilnya dirender di server.
 */
export function FilterBar({ basePath, query, searchPlaceholder, children, hasActiveFilters }: FilterBarProps) {
  return (
    <form method="get" action={basePath} role="search" className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-56">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className={`${inputClass} pl-9`}
        />
      </div>
      {children}
      <button type="submit" className={buttonClass("primary")}>
        Cari
      </button>
      {hasActiveFilters && (
        <Link href={basePath} className={buttonClass("ghost")}>
          Atur ulang
        </Link>
      )}
    </form>
  );
}
