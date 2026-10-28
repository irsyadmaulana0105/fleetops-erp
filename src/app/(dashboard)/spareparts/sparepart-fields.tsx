import { Field } from "@/components/ui/form";
import { CATEGORY_OPTIONS } from "@/lib/validation/sparepart";

export type SparepartDefaults = {
  sku?: string;
  name?: string;
  category?: string;
  stock?: number;
  minStock?: number;
  buyPrice?: number;
  sellPrice?: number;
  unit?: string;
};

export function SparepartFields({ defaults = {} }: { defaults?: SparepartDefaults }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="sku" label="SKU" required defaultValue={defaults.sku} placeholder="FLT-OIL-001" hint="Kode unik barang; otomatis huruf besar." />
        <Field name="category" label="Kategori" kind="select" required options={CATEGORY_OPTIONS} defaultValue={defaults.category} />
      </div>
      <Field name="name" label="Nama barang" required defaultValue={defaults.name} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="stock" label="Stok" kind="number" min={0} required defaultValue={defaults.stock ?? 0} />
        <Field
          name="minStock"
          label="Stok minimum"
          kind="number"
          min={0}
          required
          defaultValue={defaults.minStock ?? 2}
          hint="Peringatan muncul jika stok ≤ nilai ini."
        />
        <Field name="unit" label="Satuan" required defaultValue={defaults.unit ?? "pcs"} placeholder="pcs, set, m" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="buyPrice" label="Harga modal (Rp)" kind="number" min={0} required defaultValue={defaults.buyPrice ?? 0} hint="HPP per satuan." />
        <Field name="sellPrice" label="Harga jual (Rp)" kind="number" min={0} required defaultValue={defaults.sellPrice ?? 0} hint="Harga ke klien per satuan." />
      </div>
    </>
  );
}
