import { z } from "zod";
import { Role } from "@/generated/prisma/client";
import { checkbox, optionalPhone, requiredEmail, requiredText } from "./common";

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "owner", label: "Pemilik" },
  { value: "admin", label: "Admin" },
  { value: "mechanic", label: "Mekanik" },
];

export const MIN_PASSWORD_LENGTH = 10;

const password = z
  .string({ error: "Wajib diisi" })
  .min(MIN_PASSWORD_LENGTH, `Minimal ${MIN_PASSWORD_LENGTH} karakter`)
  // bcrypt hanya memakai 72 byte pertama; tolak lebih panjang daripada memotong diam-diam.
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Terlalu panjang (maksimal 72 byte)");

const baseUser = {
  name: requiredText(100),
  email: requiredEmail(100),
  role: z.enum(Role, { error: "Pilih peran" }),
  phone: optionalPhone(),
  isActive: checkbox(),
};

export const createUserSchema = z.object({ ...baseUser, password });

/** Saat mengubah: kata sandi boleh dikosongkan (artinya tidak diganti). */
export const updateUserSchema = z.object({
  ...baseUser,
  password: z
    .string()
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(password.nullable()),
});
