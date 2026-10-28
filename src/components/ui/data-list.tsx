import clsx from "clsx";
import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "right";
  /** Sembunyikan kolom ini pada tampilan kartu di HP (mis. informasi sekunder). */
  hideOnCard?: boolean;
};

type DataListProps<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  /** Judul kartu di HP (biasanya kolom utama, mis. nama perusahaan). */
  cardTitle: (row: T) => ReactNode;
  cardSubtitle?: (row: T) => ReactNode;
  /** Tombol aksi per baris (ubah, hapus). */
  actions?: (row: T) => ReactNode;
  empty: ReactNode;
  caption: string;
  /**
   * Lebar layar minimum untuk menampilkan tabel; di bawahnya dipakai kartu.
   * Tabel dengan banyak kolom (mis. sparepart) sebaiknya baru tampil di "xl" karena sidebar menyempitkan konten di "lg".
   */
  tableFrom?: "md" | "lg" | "xl";
};

// Kelas Tailwind harus tertulis utuh agar terdeteksi saat build — jangan dirakit dari string.
const SHOW_TABLE = { md: "md:block", lg: "lg:block", xl: "xl:block" } as const;
const HIDE_CARDS = { md: "md:hidden", lg: "lg:hidden", xl: "xl:hidden" } as const;

/**
 * Daftar data responsif: tabel di layar lebar (lihat `tableFrom`), kartu di HP dan tablet.
 * Server component — `cell`, `cardTitle`, dan `actions` boleh berisi komponen client.
 */
export function DataList<T>({
  rows,
  columns,
  rowKey,
  cardTitle,
  cardSubtitle,
  actions,
  empty,
  caption,
  tableFrom = "lg",
}: DataListProps<T>) {
  if (rows.length === 0) {
    return <div className="rounded-xl border border-slate-200 bg-white">{empty}</div>;
  }

  return (
    <>
      {/* Tabel — layar lebar. `relative` mengurung teks sr-only agar tidak melebarkan halaman. */}
      <div className={clsx("relative hidden overflow-x-auto rounded-xl border border-slate-200 bg-white", SHOW_TABLE[tableFrom])}>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={clsx("px-4 py-3 font-medium", column.align === "right" && "text-right")}
                >
                  {column.header}
                </th>
              ))}
              {actions && (
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Aksi</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-slate-50/70">
                {columns.map((column) => (
                  <td key={column.key} className={clsx("px-4 py-3 align-middle", column.align === "right" && "text-right")}>
                    {column.cell(row)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 align-middle">
                    <div className="flex justify-end gap-1">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Kartu — HP & tablet (dua kolom di tablet) */}
      <ul className={clsx("space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0", HIDE_CARDS[tableFrom])} aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{cardTitle(row)}</p>
                {cardSubtitle && <p className="mt-0.5 text-sm text-slate-600">{cardSubtitle(row)}</p>}
              </div>
              {actions && <div className="flex shrink-0 gap-1">{actions(row)}</div>}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {columns
                .filter((column) => !column.hideOnCard)
                .map((column) => (
                  <div key={column.key} className="min-w-0">
                    <dt className="text-xs text-slate-500">{column.header}</dt>
                    <dd className="mt-0.5 break-words text-slate-900">{column.cell(row)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
