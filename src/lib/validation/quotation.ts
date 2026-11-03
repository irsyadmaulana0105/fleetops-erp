import { z } from "zod";
import type { QuotationStatus } from "@/generated/prisma/client";
import type { BadgeTone } from "@/components/ui/badge";
import { checkbox, integer, optionalText, requiredText, rupiah } from "./common";
import { requiredDate } from "./dates";

export const QUOTATION_STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Menunggu klien",
  approved: "Disetujui",
  revised: "Perlu revisi",
  rejected: "Ditolak",
};

export const QUOTATION_STATUS_TONE: Record<QuotationStatus, BadgeTone> = {
  draft: "neutral",
  sent: "warning",
  approved: "success",
  revised: "warning",
  rejected: "danger",
};

/** Alur status penawaran. `approved` dan `rejected` adalah status akhir. */
export const QUOTATION_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ["sent"],
  sent: ["approved", "revised", "rejected"],
  revised: ["sent"],
  approved: [],
  rejected: [],
};

/** Isi penawaran hanya boleh diubah pada status ini. */
export const EDITABLE_QUOTATION_STATUSES: QuotationStatus[] = ["draft", "revised"];

export const quotationHeaderSchema = z.object({
  customerId: integer({ min: 1 }),
  validUntil: requiredDate(),
  discount: rupiah(),
  applyPpn: checkbox(),
  notes: optionalText(1000),
});

export const MAX_QUOTATION_ITEMS = 100;
const MAX_QTY = 100_000;

export type QuotationItemInput =
  | { itemType: "sparepart"; sparepartId: number; description: string; qty: number; unitPrice: number }
  | { itemType: "labor"; sparepartId: null; description: string; qty: number; unitPrice: number };

const qtySchema = integer({ min: 1, max: MAX_QTY });

/**
 * Baris dikirim sebagai daftar sejajar: itemType[], sparepartId[], description[], qty[], unitPrice[].
 * Baris sparepart memakai sparepartId (deskripsi diisi server dari data barang); baris jasa memakai deskripsi.
 */
export function parseQuotationItems(
  formData: FormData,
): { ok: true; items: QuotationItemInput[] } | { ok: false; errors: string[] } {
  const types = formData.getAll("itemType").map(String);
  const partIds = formData.getAll("sparepartId").map(String);
  const descriptions = formData.getAll("description").map(String);
  const quantities = formData.getAll("qty").map(String);
  const prices = formData.getAll("unitPrice").map(String);

  if (types.length === 0) return { ok: false, errors: ["Tambahkan minimal satu baris barang atau jasa."] };
  if (types.length > MAX_QUOTATION_ITEMS) return { ok: false, errors: [`Maksimal ${MAX_QUOTATION_ITEMS} baris per penawaran.`] };
  if ([partIds, descriptions, quantities, prices].some((list) => list.length !== types.length)) {
    return { ok: false, errors: ["Data baris tidak lengkap. Muat ulang halaman lalu coba lagi."] };
  }

  const errors: string[] = [];
  const items: QuotationItemInput[] = [];
  const seen = new Set<number>();

  types.forEach((type, index) => {
    const n = index + 1;
    const qty = qtySchema.safeParse(quantities[index]);
    const price = rupiah().safeParse(prices[index]);
    if (!qty.success) return void errors.push(`Baris ${n}: jumlah ${(z.flattenError(qty.error).formErrors[0] ?? "tidak valid").toLowerCase()}.`);
    if (!price.success) return void errors.push(`Baris ${n}: harga ${(z.flattenError(price.error).formErrors[0] ?? "tidak valid").toLowerCase()}.`);

    if (type === "sparepart") {
      const id = integer({ min: 1 }).safeParse(partIds[index]);
      if (!id.success) return void errors.push(`Baris ${n}: pilih barang.`);
      if (seen.has(id.data)) return void errors.push(`Baris ${n}: barang yang sama sudah ada di baris lain. Gabungkan jumlahnya.`);
      seen.add(id.data);
      items.push({ itemType: "sparepart", sparepartId: id.data, description: "", qty: qty.data, unitPrice: price.data });
    } else if (type === "labor") {
      const text = requiredText(255).safeParse(descriptions[index]);
      if (!text.success) return void errors.push(`Baris ${n}: uraian jasa wajib diisi (maksimal 255 karakter).`);
      items.push({ itemType: "labor", sparepartId: null, description: text.data, qty: qty.data, unitPrice: price.data });
    } else {
      errors.push(`Baris ${n}: jenis baris tidak dikenal.`);
    }
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, items };
}

export const customerDecisionSchema = z.object({
  note: optionalText(1000),
});
