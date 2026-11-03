"use client";

import { Plus, Trash2 } from "lucide-react";
import { useContext, useId, useRef, useState } from "react";
import { FormStateContext } from "@/components/ui/form";
import { buttonClass, inputClass } from "@/components/ui/styles";
import { formatRupiah } from "@/lib/format";

export type PartOption = { id: number; sku: string; name: string; unit: string; sellPrice: number; stock: number };
export type ItemDefault = { itemType: "sparepart" | "labor"; sparepartId: number | null; description: string; qty: number; unitPrice: number };

type Row = { key: number; itemType: "sparepart" | "labor"; sparepartId: string; description: string; qty: string; unitPrice: string };

const PPN_RATE = 0.11;

/**
 * Baris penawaran (barang atau jasa) beserta diskon dan PPN, dengan ringkasan total langsung.
 * Setiap baris selalu mengirim kelima kolom (itemType, sparepartId, description, qty, unitPrice) —
 * kolom yang tidak dipakai dikirim kosong — sehingga urutannya tetap sejajar di server.
 * Angka di layar hanya pratinjau; total resmi dihitung ulang di server dengan Decimal.
 */
export function QuotationItemsEditor({
  spareparts,
  defaults,
  discount: initialDiscount = 0,
  applyPpn: initialPpn = false,
}: {
  spareparts: PartOption[];
  defaults?: ItemDefault[];
  discount?: number;
  applyPpn?: boolean;
}) {
  const { fieldErrors } = useContext(FormStateContext);
  const errors = fieldErrors?.items;
  const discountError = fieldErrors?.discount?.[0];
  const nextKey = useRef(1);
  const makeRow = (item?: ItemDefault): Row => ({
    key: nextKey.current++,
    itemType: item?.itemType ?? "sparepart",
    sparepartId: item?.sparepartId ? String(item.sparepartId) : "",
    description: item?.itemType === "labor" ? item.description : "",
    qty: item ? String(item.qty) : "1",
    unitPrice: item ? String(item.unitPrice) : "",
  });

  const [rows, setRows] = useState<Row[]>(() => (defaults && defaults.length > 0 ? defaults.map(makeRow) : [makeRow()]));
  const [discount, setDiscount] = useState(String(initialDiscount));
  const [ppn, setPpn] = useState(initialPpn);
  const headingId = useId();

  const byId = new Map(spareparts.map((part) => [String(part.id), part]));
  const update = (key: number, patch: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const lineTotal = (row: Row) => (Number(row.qty) || 0) * (Number(row.unitPrice) || 0);

  const subtotal = rows.reduce((sum, row) => sum + lineTotal(row), 0);
  const discountValue = Math.max(0, Number(discount) || 0);
  const taxable = Math.max(0, subtotal - discountValue);
  const tax = ppn ? Math.round(taxable * PPN_RATE) : 0;

  return (
    <fieldset className="space-y-4" aria-labelledby={headingId}>
      <legend id={headingId} className="text-sm font-semibold text-slate-900">
        Barang dan jasa
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
          const part = byId.get(row.sparepartId);
          const qty = Number(row.qty) || 0;
          const short = row.itemType === "sparepart" && part && qty > part.stock;
          return (
            <li key={row.key} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,2fr)_5.5rem_9rem_auto] sm:items-end">
                <div>
                  <label htmlFor={`${idBase}-type`} className="mb-1.5 block text-sm font-medium text-slate-800">
                    Jenis {rows.length > 1 && <span className="text-slate-500">#{index + 1}</span>}
                  </label>
                  <select
                    id={`${idBase}-type`}
                    name="itemType"
                    value={row.itemType}
                    onChange={(event) => update(row.key, { itemType: event.target.value as Row["itemType"] })}
                    className={inputClass}
                  >
                    <option value="sparepart">Barang</option>
                    <option value="labor">Jasa</option>
                  </select>
                </div>

                <div>
                  {row.itemType === "sparepart" ? (
                    <>
                      <label htmlFor={`${idBase}-part`} className="mb-1.5 block text-sm font-medium text-slate-800">
                        Sparepart
                      </label>
                      <select
                        id={`${idBase}-part`}
                        name="sparepartId"
                        value={row.sparepartId}
                        onChange={(event) => {
                          const picked = byId.get(event.target.value);
                          // Harga awal mengikuti harga jual; tetap bisa disesuaikan per penawaran.
                          update(row.key, { sparepartId: event.target.value, unitPrice: row.unitPrice === "" && picked ? String(picked.sellPrice) : row.unitPrice });
                        }}
                        className={inputClass}
                      >
                        {/* Bukan `disabled`: opsi kosong yang terpilih harus tetap terkirim agar kolom tetap sejajar. */}
                        <option value="">Pilih sparepart…</option>
                        {spareparts.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.sku} — {option.name}
                          </option>
                        ))}
                      </select>
                      <input type="hidden" name="description" value="" />
                    </>
                  ) : (
                    <>
                      <label htmlFor={`${idBase}-desc`} className="mb-1.5 block text-sm font-medium text-slate-800">
                        Uraian jasa
                      </label>
                      <input
                        id={`${idBase}-desc`}
                        name="description"
                        type="text"
                        maxLength={255}
                        placeholder="Jasa penggantian seal kit"
                        value={row.description}
                        onChange={(event) => update(row.key, { description: event.target.value })}
                        className={inputClass}
                      />
                      <input type="hidden" name="sparepartId" value="" />
                    </>
                  )}
                </div>

                <div>
                  <label htmlFor={`${idBase}-qty`} className="mb-1.5 block text-sm font-medium text-slate-800">
                    Jumlah{part && row.itemType === "sparepart" ? ` (${part.unit})` : ""}
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
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className={short ? "font-medium text-amber-800" : "text-slate-500"}>
                  {row.itemType === "sparepart" && part
                    ? short
                      ? `Stok saat ini ${part.stock} ${part.unit}, kurang dari jumlah ini. Pastikan PO sudah masuk sebelum pekerjaan selesai.`
                      : `Stok saat ini ${part.stock} ${part.unit}`
                    : ""}
                </p>
                <p className="text-slate-600">
                  Subtotal <span className="font-medium text-slate-900">{formatRupiah(lineTotal(row))}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={() => setRows((current) => [...current, makeRow()])} className={buttonClass("secondary")}>
        <Plus aria-hidden="true" className="size-4" />
        Tambah baris
      </button>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 sm:p-5">
        <div className="space-y-4">
          <div>
            <label htmlFor={`${headingId}-discount`} className="mb-1.5 block text-sm font-medium text-slate-800">
              Diskon (Rp)
            </label>
            <input
              id={`${headingId}-discount`}
              name="discount"
              type="number"
              inputMode="numeric"
              min={0}
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              aria-invalid={discountError ? true : undefined}
              className={inputClass}
            />
            {discountError && <p className="mt-1 text-xs font-medium text-red-700">{discountError}</p>}
          </div>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
            <input type="checkbox" name="applyPpn" checked={ppn} onChange={(event) => setPpn(event.target.checked)} className="size-5 rounded border-slate-300 accent-amber-500" />
            Kenakan PPN 11%
          </label>
        </div>
        <dl className="space-y-1.5 text-sm">
          <Total label="Subtotal" value={formatRupiah(subtotal)} />
          {discountValue > 0 && <Total label="Diskon" value={`- ${formatRupiah(discountValue)}`} />}
          {ppn && <Total label="PPN 11%" value={formatRupiah(tax)} />}
          <div className="flex items-baseline justify-between border-t border-slate-300 pt-2">
            <dt className="font-semibold text-slate-900">Total</dt>
            <dd className="text-lg font-semibold text-slate-900">{formatRupiah(taxable + tax)}</dd>
          </div>
        </dl>
      </div>
    </fieldset>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
