import type { InvoiceStatus } from "@/generated/prisma/client";
import type { BadgeTone } from "@/components/ui/badge";

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
 * Status yang ditampilkan. Perubahan otomatis ke `overdue` di database baru dibuat di Fase 4;
 * sampai saat itu invoice yang belum lunas dan sudah lewat jatuh tempo ditandai di tampilan saja.
 */
export function effectiveInvoiceStatus(invoice: { status: InvoiceStatus; dueDate: Date }, today: Date): InvoiceStatus {
  if ((invoice.status === "unpaid" || invoice.status === "partially_paid") && invoice.dueDate < today) return "overdue";
  return invoice.status;
}
