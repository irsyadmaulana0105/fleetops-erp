import { Field } from "@/components/ui/form";

export type WorkOrderDefaults = {
  customerId?: number;
  mechanicId?: number;
  unitModel?: string;
  serialNumber?: string | null;
  symptomNotes?: string;
  laborFee?: number;
  scheduledAt?: string;
};

type Props = {
  customers: { id: number; companyName: string }[];
  mechanics: { id: number; name: string }[];
  defaults?: WorkOrderDefaults;
};

/** Isian work order — dipakai bersama oleh halaman "Buat" dan dialog "Ubah". */
export function WorkOrderFields({ customers, mechanics, defaults = {} }: Props) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="customerId"
          label="Customer (lokasi pabrik)"
          kind="select"
          required
          defaultValue={defaults.customerId}
          options={customers.map((c) => ({ value: String(c.id), label: c.companyName }))}
        />
        <Field
          name="mechanicId"
          label="Mekanik"
          kind="select"
          required
          defaultValue={defaults.mechanicId}
          options={mechanics.map((m) => ({ value: String(m.id), label: m.name }))}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="unitModel" label="Model unit forklift" required defaultValue={defaults.unitModel} placeholder="Toyota 8FD25" />
        <Field name="serialNumber" label="Nomor seri" defaultValue={defaults.serialNumber} hint="Opsional." />
      </div>
      <Field name="symptomNotes" label="Keluhan / pekerjaan" kind="textarea" rows={4} required defaultValue={defaults.symptomNotes} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="scheduledAt" label="Jadwal (WIB)" kind="datetime-local" required defaultValue={defaults.scheduledAt} />
        <Field name="laborFee" label="Ongkos jasa (Rp)" kind="number" min={0} required defaultValue={defaults.laborFee ?? 0} hint="Tidak terlihat oleh mekanik." />
      </div>
    </>
  );
}
