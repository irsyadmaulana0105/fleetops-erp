import { formatRupiah } from "@/lib/format";

export type DocumentLine = {
  id: number;
  description: string;
  /** Keterangan kecil di bawah uraian, mis. "Jasa" atau "Barang". */
  kind?: string;
  qty: number;
  /** Satuan barang (pcs, set, ...). */
  unit?: string | null;
  unitPrice: { toString(): string };
  subtotal: { toString(): string };
};

export type TotalLine = { label: string; value: string; strong?: boolean; muted?: boolean };

type Props = {
  caption: string;
  lines: DocumentLine[];
  totals: TotalLine[];
};

/**
 * Rincian penawaran/invoice. Di HP: satu kartu per baris dan blok total di bawahnya, sehingga angka total
 * tidak pernah tergeser keluar layar. Di layar lebar: tabel biasa dengan total di bagian bawah tabel.
 */
export function DocumentLines({ caption, lines, totals }: Props) {
  return (
    <>
      <ul className="divide-y divide-slate-100 sm:hidden" aria-label={caption}>
        {lines.map((line) => (
          <li key={line.id} className="px-4 py-3">
            <p className="font-medium text-slate-900">{line.description}</p>
            {line.kind && <p className="text-xs text-slate-500">{line.kind}</p>}
            <p className="mt-1 flex items-baseline justify-between gap-3 text-sm text-slate-600">
              <span>
                {line.qty.toLocaleString("id-ID")}
                {line.unit ? ` ${line.unit}` : ""} × {formatRupiah(line.unitPrice)}
              </span>
              <span className="font-medium text-slate-900">{formatRupiah(line.subtotal)}</span>
            </p>
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:hidden">
        {totals.map((total) => (
          <div key={total.label} className="flex items-baseline justify-between gap-3">
            <dt className={total.strong ? "font-semibold text-slate-900" : "text-slate-700"}>{total.label}</dt>
            <dd className={total.strong ? "text-base font-semibold text-slate-900" : total.muted ? "text-slate-500" : "text-slate-900"}>{total.value}</dd>
          </div>
        ))}
      </dl>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">Uraian</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Jumlah</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Harga satuan</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="px-5 py-3">
                  <span className="block font-medium text-slate-900">{line.description}</span>
                  {line.kind && <span className="block text-xs text-slate-500">{line.kind}</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {line.qty.toLocaleString("id-ID")} {line.unit && <span className="text-slate-500">{line.unit}</span>}
                </td>
                <td className="px-4 py-3 text-right">{formatRupiah(line.unitPrice)}</td>
                <td className="px-5 py-3 text-right font-medium">{formatRupiah(line.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50">
            {totals.map((total) => (
              <tr key={total.label}>
                <th scope="row" colSpan={3} className={`px-4 py-2 text-right ${total.strong ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>{total.label}</th>
                <td className={`px-5 py-2 text-right ${total.strong ? "text-base font-semibold text-slate-900" : total.muted ? "text-slate-500" : "text-slate-900"}`}>{total.value}</td>
              </tr>
            ))}
          </tfoot>
        </table>
      </div>
    </>
  );
}
