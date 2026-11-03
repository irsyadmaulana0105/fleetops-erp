import { z } from "zod";
import type { InvoiceStatus } from "@/generated/prisma/client";
import type { BadgeTone } from "@/components/ui/badge";
import { optionalText, requiredText } from "./common";

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  unpaid: "Belum dibayar",
  partially_paid: "Dibayar sebagian",
  paid: "Lunas",
  overdue: "Lewat jatuh tempo",
};

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  unpaid: "warning",
  partially_paid: "warning",
  paid: "success",
  overdue: "danger",
};

/**
 * Status yang ditampilkan. Sejak Fase 4, cron harian (`/api/cron/overdue`) memindahkan invoice
 * unpaid/partially_paid yang lewat jatuh tempo ke `overdue` di database; fungsi ini tetap dipakai
 * sebagai pengaman tampilan untuk baris lama yang belum terevaluasi.
 */
export function effectiveInvoiceStatus(invoice: { status: InvoiceStatus; dueDate: Date }, today: Date): InvoiceStatus {
  if ((invoice.status === "unpaid" || invoice.status === "partially_paid") && invoice.dueDate < today) return "overdue";
  return invoice.status;
}

export const PAYMENT_METHODS = ["Transfer BCA", "Transfer bank lain", "Virtual account", "Cek/Giro", "Tunai", "Lainnya"] as const;

/**
 * Nominal pembayaran: bilangan rupiah dengan opsional sen (maks 2 desimal), mis. "1500000" atau "1500000.50".
 * Divalidasi sebagai string agar tidak ada galat floating point; dikonversi ke Decimal di service.
 */
export const paymentAmountSchema = z
  .string({ error: "Wajib diisi" })
  .trim()
  .min(1, "Wajib diisi")
  .regex(/^\d{1,13}([.,]\d{1,2})?$/, "Nominal tidak valid (contoh: 1500000 atau 1500000.50)")
  .transform((value) => value.replace(",", "."));

export const paymentSchema = z.object({
  amount: paymentAmountSchema,
  paymentMethod: requiredText(50),
  transactionRef: optionalText(100),
  notes: optionalText(500),
});

export type PaymentFormInput = z.output<typeof paymentSchema>;
