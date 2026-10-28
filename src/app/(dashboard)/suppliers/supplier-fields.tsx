import { Field } from "@/components/ui/form";

export type SupplierDefaults = {
  companyName?: string;
  country?: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
};

export function SupplierFields({ defaults = {} }: { defaults?: SupplierDefaults }) {
  return (
    <>
      <Field name="companyName" label="Nama perusahaan" required defaultValue={defaults.companyName} />
      <Field
        name="country"
        label="Negara asal"
        required
        defaultValue={defaults.country ?? "Indonesia"}
        hint="Isi negara supplier impor, mis. Jepang atau Tiongkok."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="contactPerson" label="Kontak person" defaultValue={defaults.contactPerson} />
        <Field name="phone" label="Telepon" kind="tel" defaultValue={defaults.phone} />
      </div>
      <Field name="email" label="Email" kind="email" defaultValue={defaults.email} />
    </>
  );
}
