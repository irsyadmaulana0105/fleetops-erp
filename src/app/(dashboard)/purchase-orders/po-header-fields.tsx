import { Field } from "@/components/ui/form";

export type PoHeaderDefaults = { supplierId?: number; etaDate?: string; trackingNumber?: string | null };

export function PoHeaderFields({ suppliers, defaults = {} }: { suppliers: { id: number; companyName: string; country: string }[]; defaults?: PoHeaderDefaults }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field
        name="supplierId"
        label="Supplier"
        kind="select"
        required
        defaultValue={defaults.supplierId}
        options={suppliers.map((s) => ({ value: String(s.id), label: s.country === "Indonesia" ? s.companyName : `${s.companyName} (${s.country})` }))}
      />
      <Field name="etaDate" label="Estimasi tiba" kind="date" defaultValue={defaults.etaDate} hint="Opsional." />
      <Field name="trackingNumber" label="Nomor resi / airwaybill" defaultValue={defaults.trackingNumber} hint="Opsional. Bisa diisi setelah barang dikirim." />
    </div>
  );
}
