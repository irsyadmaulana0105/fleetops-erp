import { Field } from "@/components/ui/form";

export type QuotationHeaderDefaults = { customerId?: number; validUntil?: string; notes?: string | null };

export function QuotationHeaderFields({ customers, defaults = {} }: { customers: { id: number; companyName: string }[]; defaults?: QuotationHeaderDefaults }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="customerId"
          label="Customer"
          kind="select"
          required
          defaultValue={defaults.customerId}
          options={customers.map((c) => ({ value: String(c.id), label: c.companyName }))}
        />
        <Field name="validUntil" label="Berlaku sampai" kind="date" required defaultValue={defaults.validUntil} />
      </div>
      <Field name="notes" label="Catatan untuk klien" kind="textarea" rows={3} defaultValue={defaults.notes} hint="Opsional. Tampil di halaman persetujuan dan PDF." />
    </>
  );
}
