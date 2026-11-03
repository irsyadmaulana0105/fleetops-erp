import { Prisma } from "@/generated/prisma/client";

/** PPN 11%. Dipakai hanya bila penawaran ditandai "dengan PPN". */
export const PPN_RATE = "0.11";

/** Batas atas kolom DECIMAL(15,2) dalam rupiah utuh. */
export const MAX_AMOUNT = 9_999_999_999_999;

export type LineInput = { qty: number; unitPrice: number };

export type Totals = {
  lineSubtotals: Prisma.Decimal[];
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  taxPpn: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
};

/**
 * Menghitung total penawaran dengan Decimal (tanpa galat pembulatan floating point).
 * PPN = 11% dari (subtotal − diskon), dibulatkan ke rupiah utuh (setengah ke atas).
 */
export function computeTotals(
  lines: LineInput[],
  discountRupiah: number,
  applyPpn: boolean,
): { ok: true; totals: Totals } | { ok: false; message: string } {
  const lineSubtotals = lines.map((line) => new Prisma.Decimal(line.qty).mul(line.unitPrice));
  const subtotal = lineSubtotals.reduce((sum, value) => sum.add(value), new Prisma.Decimal(0));
  const discount = new Prisma.Decimal(discountRupiah);

  if (discount.gt(subtotal)) return { ok: false, message: "Diskon tidak boleh melebihi subtotal." };
  const taxable = subtotal.sub(discount);
  const taxPpn = applyPpn ? taxable.mul(PPN_RATE).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP) : new Prisma.Decimal(0);
  const grandTotal = taxable.add(taxPpn);

  if (grandTotal.gt(MAX_AMOUNT)) return { ok: false, message: "Total melebihi batas yang bisa disimpan. Periksa jumlah dan harga." };
  return { ok: true, totals: { lineSubtotals, subtotal, discount, taxPpn, grandTotal } };
}
