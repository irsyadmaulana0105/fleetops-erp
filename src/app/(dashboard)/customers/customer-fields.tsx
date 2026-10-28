import { Field } from "@/components/ui/form";
import { TOP_DAYS_DEFAULT } from "@/lib/validation/customer";

export type CustomerDefaults = {
  companyName?: string;
  picName?: string;
  picPhone?: string;
  email?: string | null;
  address?: string;
  topDays?: number;
};

/** Isian form customer — dipakai bersama oleh dialog "Tambah" dan "Ubah". */
export function CustomerFields({ defaults = {} }: { defaults?: CustomerDefaults }) {
  return (
    <>
      <Field name="companyName" label="Nama perusahaan" required defaultValue={defaults.companyName} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="picName" label="Nama PIC" required defaultValue={defaults.picName} />
        <Field name="picPhone" label="Telepon PIC" kind="tel" required defaultValue={defaults.picPhone} placeholder="0812 3456 7890" />
      </div>
      <Field name="email" label="Email" kind="email" defaultValue={defaults.email} hint="Opsional. Dipakai untuk mengirim penawaran." />
      <Field name="address" label="Alamat" kind="textarea" required defaultValue={defaults.address} />
      <Field
        name="topDays"
        label="TOP (hari)"
        kind="number"
        min={0}
        max={365}
        required
        defaultValue={defaults.topDays ?? TOP_DAYS_DEFAULT}
        hint="Tempo pembayaran invoice. Bawaan 180 hari (6 bulan); isi 0 untuk bayar di muka."
      />
    </>
  );
}
