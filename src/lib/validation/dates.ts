import { z } from "zod";
import { parseDateOnly, parseWibLocal } from "@/lib/datetime";

/** Tanggal opsional dari <input type="date">: kosong → null, jika diisi harus tanggal yang nyata. */
export const optionalDate = () =>
  z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
      if (!value) return null;
      const date = parseDateOnly(value);
      if (!date) {
        ctx.addIssue({ code: "custom", message: "Tanggal tidak valid" });
        return z.NEVER;
      }
      return date;
    });

/** Tanggal & jam wajib dari <input type="datetime-local">, ditafsirkan sebagai WIB. */
export const requiredWibDateTime = () =>
  z
    .string({ error: "Wajib diisi" })
    .trim()
    .min(1, "Wajib diisi")
    .transform((value, ctx) => {
      const date = parseWibLocal(value);
      if (!date) {
        ctx.addIssue({ code: "custom", message: "Tanggal atau jam tidak valid" });
        return z.NEVER;
      }
      return date;
    });
