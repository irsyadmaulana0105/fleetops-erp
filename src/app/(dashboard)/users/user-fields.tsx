import { Field } from "@/components/ui/form";
import { MIN_PASSWORD_LENGTH, ROLE_OPTIONS } from "@/lib/validation/user";

export type UserDefaults = {
  name?: string;
  email?: string;
  role?: string;
  phone?: string | null;
  isActive?: boolean;
};

type UserFieldsProps = {
  defaults?: UserDefaults;
  mode: "create" | "edit";
  /** Akun yang sedang dilihat adalah akun pengguna yang login: peran & status dikunci. */
  isSelf?: boolean;
};

export function UserFields({ defaults = {}, mode, isSelf = false }: UserFieldsProps) {
  return (
    <>
      <Field name="name" label="Nama lengkap" required defaultValue={defaults.name} />
      <Field name="email" label="Email" kind="email" required defaultValue={defaults.email} autoComplete="off" hint="Dipakai untuk masuk." />
      <Field name="phone" label="Telepon" kind="tel" defaultValue={defaults.phone} />

      {isSelf ? (
        <>
          {/* Dikirim tersembunyi agar tetap lolos validasi; server menolak perubahan pada akun sendiri. */}
          <input type="hidden" name="role" value="owner" />
          <input type="hidden" name="isActive" value="on" />
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Ini akun Anda. Peran dan status aktif tidak dapat diubah dari sini agar sistem tidak kehilangan pemilik.
          </p>
        </>
      ) : (
        <>
          <Field name="role" label="Peran" kind="select" required options={ROLE_OPTIONS} defaultValue={defaults.role} />
          <Field
            name="isActive"
            label="Akun aktif"
            kind="checkbox"
            defaultValue={mode === "create" ? true : defaults.isActive}
            hint="Akun nonaktif tidak bisa masuk. Riwayat pekerjaannya tetap tersimpan."
          />
        </>
      )}

      <Field
        name="password"
        label={mode === "create" ? "Kata sandi" : "Kata sandi baru"}
        kind="password"
        required={mode === "create"}
        hint={
          mode === "create"
            ? `Minimal ${MIN_PASSWORD_LENGTH} karakter. Sampaikan ke pengguna lewat jalur yang aman.`
            : "Kosongkan jika tidak ingin mengganti."
        }
      />
    </>
  );
}
