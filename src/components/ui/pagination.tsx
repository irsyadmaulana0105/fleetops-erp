import clsx from "clsx";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  basePath: string;
  /** Parameter pencarian/filter yang harus dipertahankan saat pindah halaman. */
  params: Record<string, string | undefined>;
};

function hrefFor(basePath: string, params: PaginationProps["params"], page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({ page, pageCount, total, pageSize, basePath, params }: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const linkClass = "inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50";
  const disabledClass = "inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-400";

  return (
    <nav aria-label="Halaman" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">
        Menampilkan {from.toLocaleString("id-ID")}–{to.toLocaleString("id-ID")} dari {total.toLocaleString("id-ID")}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(basePath, params, page - 1)} className={linkClass}>
            <ChevronLeft aria-hidden="true" className="size-4" />
            Sebelumnya
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            <ChevronLeft aria-hidden="true" className="size-4" />
            Sebelumnya
          </span>
        )}
        <span className="px-1 text-sm text-slate-600">
          {page} / {pageCount}
        </span>
        {page < pageCount ? (
          <Link href={hrefFor(basePath, params, page + 1)} className={linkClass}>
            Berikutnya
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        ) : (
          <span aria-disabled="true" className={clsx(disabledClass)}>
            Berikutnya
            <ChevronRight aria-hidden="true" className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
