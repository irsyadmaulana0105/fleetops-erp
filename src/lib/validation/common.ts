import { z } from "zod";

/**
 * Blok bangun skema validasi. Semua input form tiba sebagai string (FormData),
 * jadi angka dan teks opsional diolah di sini agar skema tiap modul tetap ringkas.
 */

/** Teks wajib: dipangkas, tidak boleh kosong, ada batas panjang. */
export const requiredText = (max: number) =>
  z
    .string({ error: "Wajib diisi" })
    .trim()
    .min(1, "Wajib diisi")
    .max(max, `Maksimal ${max} karakter`);

/** Teks opsional: kosong → null (agar kolom di database benar-benar dikosongkan). */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
    .optional()
    .transform((value) => (value ? value : null));

/** Email opsional: kosong → null; jika diisi harus berformat email. */
export const optionalEmail = (max = 100) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
    .optional()
    .transform((value) => (value ? value.toLowerCase() : null))
    .pipe(z.email("Format email tidak valid").nullable());

export const requiredEmail = (max = 100) =>
  z
    .string({ error: "Wajib diisi" })
    .trim()
    .toLowerCase()
    .min(1, "Wajib diisi")
    .max(max, `Maksimal ${max} karakter`)
    .pipe(z.email("Format email tidak valid"));

const PHONE_PATTERN = /^\+?[0-9][0-9 -]{6,18}[0-9]$/;

export const requiredPhone = () =>
  requiredText(20).refine((value) => PHONE_PATTERN.test(value), "Nomor telepon tidak valid (contoh: 0812 3456 7890)");

export const optionalPhone = () =>
  optionalText(20).refine((value) => value === null || PHONE_PATTERN.test(value), "Nomor telepon tidak valid (contoh: 0812 3456 7890)");

/** Bilangan bulat dari input teks, dengan batas. Input kosong ditolak (bukan dianggap 0). */
export const integer = (options: { min?: number; max?: number } = {}) => {
  const { min = 0, max = 2_000_000_000 } = options;
  return z
    .string({ error: "Wajib diisi" })
    .trim()
    .min(1, "Wajib diisi")
    .transform((value) => Number(value))
    .pipe(
      z
        // NaN (mis. "12abc") ditolak z.number() dengan pesan di bawah.
        .number("Harus berupa angka")
        .int("Harus bilangan bulat")
        .min(min, `Minimal ${min.toLocaleString("id-ID")}`)
        .max(max, `Maksimal ${max.toLocaleString("id-ID")}`),
    );
};

/** Nominal rupiah utuh (tanpa sen). Batas atas mengikuti DECIMAL(15,2) di database. */
export const rupiah = () => integer({ min: 0, max: 9_999_999_999_999 });

/** Checkbox HTML: ada di FormData ("on") jika dicentang, tidak ada jika tidak. */
export const checkbox = () => z.string().optional().transform((value) => value === "on");
