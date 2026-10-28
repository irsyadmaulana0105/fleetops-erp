import { z } from "zod";
import type { PurchaseOrderStatus } from "@/generated/prisma/client";
import type { BadgeTone } from "@/components/ui/badge";
import { integer, optionalText, rupiah } from "./common";
import { optionalDate } from "./dates";

export const PO_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  ordered: "Dipesan",
  customs_cleared: "Lolos bea cukai",
  received: "Diterima",
  cancelled: "Dibatalkan",
};

export const PO_STATUS_TONE: Record<PurchaseOrderStatus, BadgeTone> = {
  draft: "neutral",
  ordered: "warning",
  customs_cleared: "warning",
  received: "success",
  cancelled: "danger",
};

/** Alur status PO. `received` dan `cancelled` adalah status akhir. */
export const PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ["ordered", "cancelled"],
  ordered: ["customs_cleared", "received", "cancelled"],
  customs_cleared: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

/** Status asal yang boleh berpindah ke `to`. */
export function statusesLeadingTo(to: PurchaseOrderStatus): PurchaseOrderStatus[] {
  return (Object.keys(PO_TRANSITIONS) as PurchaseOrderStatus[]).filter((from) => PO_TRANSITIONS[from].includes(to));
}

export const purchaseOrderHeaderSchema = z.object({
  supplierId: integer({ min: 1 }),
  etaDate: optionalDate(),
  trackingNumber: optionalText(100),
});

export const shipmentSchema = z.object({
  etaDate: optionalDate(),
  trackingNumber: optionalText(100),
});

const itemRowSchema = z.object({
  sparepartId: integer({ min: 1 }),
  qty: integer({ min: 1, max: 1_000_000 }),
  unitPrice: rupiah(),
});

export type PurchaseOrderItemInput = z.output<typeof itemRowSchema>;

export const MAX_PO_ITEMS = 100;

/**
 * Baris barang dikirim sebagai tiga daftar sejajar (sparepartId[], qty[], unitPrice[]).
 * Hasilnya daftar barang valid, atau daftar pesan galat berawalan nomor baris.
 */
export function parsePurchaseOrderItems(
  formData: FormData,
): { ok: true; items: PurchaseOrderItemInput[] } | { ok: false; errors: string[] } {
  const ids = formData.getAll("sparepartId").map(String);
  const quantities = formData.getAll("qty").map(String);
  const prices = formData.getAll("unitPrice").map(String);

  if (ids.length === 0) return { ok: false, errors: ["Tambahkan minimal satu barang."] };
  if (ids.length > MAX_PO_ITEMS) return { ok: false, errors: [`Maksimal ${MAX_PO_ITEMS} baris barang per PO.`] };
  if (quantities.length !== ids.length || prices.length !== ids.length) {
    return { ok: false, errors: ["Data barang tidak lengkap. Muat ulang halaman lalu coba lagi."] };
  }

  const errors: string[] = [];
  const items: PurchaseOrderItemInput[] = [];
  const seen = new Set<number>();

  ids.forEach((id, index) => {
    const row = itemRowSchema.safeParse({ sparepartId: id, qty: quantities[index], unitPrice: prices[index] });
    if (!row.success) {
      const field = z.flattenError(row.error).fieldErrors;
      const message = field.sparepartId?.[0]
        ? "pilih barang"
        : field.qty?.[0]
          ? `jumlah: ${field.qty[0].toLowerCase()}`
          : `harga: ${(field.unitPrice?.[0] ?? "tidak valid").toLowerCase()}`;
      errors.push(`Baris ${index + 1}: ${message}.`);
      return;
    }
    if (seen.has(row.data.sparepartId)) {
      errors.push(`Baris ${index + 1}: barang yang sama sudah ada di baris lain. Gabungkan jumlahnya.`);
      return;
    }
    seen.add(row.data.sparepartId);
    items.push(row.data);
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, items };
}
