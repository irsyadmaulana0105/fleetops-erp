import { addDays, wibToday } from "@/lib/datetime";
import { createWithNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "./quotation";

/**
 * Menerbitkan invoice dari work order yang sudah selesai. Nilainya disalin dari penawaran yang disetujui
 * (subtotal, diskon, PPN, total), dan jatuh tempo = tanggal terbit + TOP klien (hari).
 * Satu WO hanya bisa punya satu invoice (kolom work_order_id unik).
 */
export async function issueInvoice(workOrderId: number): Promise<ServiceResult<{ invoiceId: number }>> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: {
      status: true,
      customerId: true,
      quotationId: true,
      customer: { select: { topDays: true } },
      quotation: { select: { status: true, subtotal: true, discount: true, taxPpn: true, grandTotal: true, customerId: true } },
      invoice: { select: { id: true } },
    },
  });
  if (!workOrder) return { ok: false, message: "Work order tidak ditemukan." };
  if (workOrder.invoice) return { ok: false, message: "Work order ini sudah punya invoice." };
  if (workOrder.status !== "completed") return { ok: false, message: "Invoice hanya bisa diterbitkan setelah work order selesai." };
  if (!workOrder.quotationId || !workOrder.quotation) return { ok: false, message: "Work order ini tidak terhubung ke penawaran, jadi nilainya belum bisa ditagihkan." };
  if (workOrder.quotation.status !== "approved") return { ok: false, message: "Penawaran terkait belum disetujui klien." };

  const issueDate = wibToday();
  const dueDate = addDays(issueDate, workOrder.customer.topDays);
  const quotation = workOrder.quotation;
  const quotationId = workOrder.quotationId;

  try {
    const created = await createWithNumber({
      code: "INV",
      listExisting: async (prefix) =>
        (await prisma.invoice.findMany({ where: { invoiceNumber: { startsWith: prefix } }, select: { invoiceNumber: true } })).map((row) => row.invoiceNumber),
      create: (invoiceNumber) =>
        prisma.invoice.create({
          data: {
            invoiceNumber,
            quotationId,
            workOrderId,
            customerId: workOrder.customerId,
            issueDate,
            dueDate,
            subtotal: quotation.subtotal,
            discount: quotation.discount,
            taxPpn: quotation.taxPpn,
            totalAmount: quotation.grandTotal,
          },
          select: { id: true },
        }),
    });
    return { ok: true, invoiceId: created.id };
  } catch (error) {
    // Dua klik bersamaan: yang kalah menabrak kolom unik work_order_id.
    const existing = await prisma.invoice.findUnique({ where: { workOrderId }, select: { id: true } });
    if (existing) return { ok: false, message: "Work order ini sudah punya invoice." };
    throw error;
  }
}
