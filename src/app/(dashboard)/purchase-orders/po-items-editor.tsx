"use client";

import { Plus, Trash2 } from "lucide-react";
import { useContext, useId, useRef, useState } from "react";
import { FormStateContext } from "@/components/ui/form";
import { buttonClass, inputClass } from "@/components/ui/styles";
import { formatRupiah } from "@/lib/format";

export type SparepartOption = { id: number; sku: string; name: string; unit: string; buyPrice: number };
export type ItemDefault = { sparepartId: number; qty: number; unitPrice: number };

type Row = { key: number; sparepartId: string; qty: string; unitPrice: string };

/**
 * Baris barang pada PO. Nilai dikirim sebagai tiga daftar sejajar (sparepartId, qty, unitPrice) —
 * urutannya sama di setiap kolom, jadi server bisa merangkainya kembali per baris.
 */
export function PoItemsEditor({ spareparts, defaults }: { spareparts: SparepartOption[]; defaults?: ItemDefault[] }) {
  const { fieldErrors } = useContext(FormStateContext);
  const errors = fieldErrors?.items;
  const nextKey = useRef(1);
  const makeRow = (item?: ItemDefault): Row => ({
    key: nextKey.current++,
    sparepartId: item ? String(item.sparepartId) : "",
    qty: item ? String(item.qty) : "1",
    unitPrice: item ? String(item.unitPrice) : "",
  });

  const [rows, setRows] = useState<Row[]>(() => (defaults && defaults.length > 0 ? defaults.map(makeRow) : [makeRow()]));
  const headingId = useId();

  const byId = new Map(spareparts.map((part) => [String(part.id), part]));
  const update = (key: number, patch: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const total = rows.reduce((sum, row) => {
    const qty = Number(row.qty);
    const price = Number(row.unitPrice);
    return Number.isFinite(qty) && Number.isFinite(price) ? sum + qty * price : sum;
  }, 0);

  return (
    <fieldset className="space-y-3" aria-labelledby={headingId}>
      <legend id={headingId} className="text-sm font-semibold text-slate-900">
        Barang yang dipesan
      </legend>

      {errors && (
        <ul role="alert" className="space-y-0.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <ul className="space-y-3">
        {rows.map((row, index) => {
          const idBase = `${headingId}-${row.key}`;
          return (
            <li key={row.key} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_6rem_9rem_auto] sm:items-end">
                <div>
                  <label htmlFor={`${idBase}-part`} className="mb-1.5 block text-sm font-medium text-slate-800">
                    Barang {rows.length > 1 && <span className="text-slate-500">#{index + 1}</span>}
                  </label>
                  <select
                    id={`${idBase}-part`}
                    name="sparepartId"
                    value={row.sparepartId}
                    onChange={(event) => {
                      const part = byId.get(event.target.value);
                      // Harga awal mengikuti harga modal; tetap bisa diubah sesuai harga di PO.
                      update(row.key, { sparepartId: event.target.value, unitPrice: row.unitPrice === "" && part ? String(part.buyPrice) : row.unitPrice });
                    }}
                    className={inputClass}
                  >
                    {/* Bukan `disabled`: opsi kosong yang dipilih harus tetap terkirim agar baris tidak bergeser dari kolom jumlah & harga. */}
                    <option value="">Pilih barang…</option>
                    {spareparts.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.sku} — {part.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`${idBase}-qty`} className="mb-1.5 block text-sm font-medium text-slate-800">
                    Jumlah{byId.get(row.sparepartId) ? ` (${byId.get(row.sparepartId)?.unit})` : ""}
                  </label>
                  <input
                    id={`${idBase}-qty`}
                    name="qty"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={row.qty}
                    onChange={(event) => update(row.key, { qty: event.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`${idBase}-price`} className="mb-1.5 block text-sm font-medium text-slate-800">
                    Harga satuan (Rp)
                  </label>
                  <input
                    id={`${idBase}-price`}
                    name="unitPrice"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={row.unitPrice}
                    onChange={(event) => update(row.key, { unitPrice: event.target.value })}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRows((current) => (current.length > 1 ? current.filter((r) => r.key !== row.key) : current))}
                  disabled={rows.length === 1}
                  aria-label={`Hapus baris ${index + 1}`}
                  className={`${buttonClass("ghost", "sm")} justify-self-end`}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  <span className="sm:sr-only">Hapus baris</span>
                </button>
              </div>
              <p className="mt-2 text-right text-sm text-slate-600">
                Subtotal <span className="font-medium text-slate-900">{formatRupiah((Number(row.qty) || 0) * (Number(row.unitPrice) || 0))}</span>
              </p>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setRows((current) => [...current, makeRow()])} className={buttonClass("secondary")}>
          <Plus aria-hidden="true" className="size-4" />
          Tambah baris
        </button>
        <p className="text-sm text-slate-600">
          Total PO <span className="text-lg font-semibold text-slate-900">{formatRupiah(total)}</span>
        </p>
      </div>
    </fieldset>
  );
}
