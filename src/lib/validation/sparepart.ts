import { z } from "zod";
import { SparepartCategory } from "@/generated/prisma/client";
import { integer, requiredText, rupiah } from "./common";

export const CATEGORY_LABEL: Record<SparepartCategory, string> = {
  filters: "Filter",
  hydraulics: "Hidrolik",
  engine: "Mesin",
  electrical: "Kelistrikan",
  tires: "Ban",
  other: "Lainnya",
};

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABEL) as SparepartCategory[]).map((value) => ({
  value,
  label: CATEGORY_LABEL[value],
}));

export const sparepartSchema = z
  .object({
    // SKU selalu huruf besar agar "flt-oil-001" dan "FLT-OIL-001" tidak menjadi dua barang.
    sku: requiredText(50)
      .transform((value) => value.toUpperCase())
      .refine((value) => /^[A-Z0-9][A-Z0-9._/-]*$/.test(value), "Hanya huruf, angka, titik, garis miring, dan strip"),
    name: requiredText(150),
    category: z.enum(SparepartCategory, { error: "Pilih kategori" }),
    stock: integer({ min: 0, max: 1_000_000 }),
    minStock: integer({ min: 0, max: 1_000_000 }),
    buyPrice: rupiah(),
    sellPrice: rupiah(),
    unit: requiredText(20),
  })
  .refine((data) => data.sellPrice >= data.buyPrice, {
    path: ["sellPrice"],
    message: "Harga jual tidak boleh lebih rendah dari harga modal",
  });
