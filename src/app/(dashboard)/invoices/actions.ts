"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { authorize, parseForm, prismaErrorState } from "@/lib/action-helpers";
import { errorState, type ActionState } from "@/lib/action-state";
import { prisma } from "@/lib/prisma";
import { recordPayment } from "@/lib/services/payment";
import { issueInvoice } from "@/lib/services/invoice";
import { paymentSchema } from "@/lib/validation/invoice";

const OFFICE = ["owner", "admin"] as const;

function revalidateInvoices(workOrderId?: number, quotationId?: number) {
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  if (workOrderId) revalidatePath(`/work-orders/${workOrderId}`);
  if (quotationId) revalidatePath(`/quotations/${quotationId}`);
}

/** Terbitkan invoice dari work order yang sudah selesai. */
export async function issueInvoiceAction(workOrderId: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;

  let invoiceId: number;
  try {
    const result = await issueInvoice(workOrderId);
    if (!result.ok) return errorState(result.message);
    invoiceId = result.invoiceId;
  } catch (error) {
    return prismaErrorState(error);
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { quotationId: true } });
  revalidateInvoices(workOrderId, invoice?.quotationId);
  redirect(`/invoices/${invoiceId}`);
}

/** Catat pembayaran masuk untuk sebuah invoice (manual oleh admin/pemilik). */
export async function recordPaymentAction(invoiceId: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;

  const parsed = parseForm(paymentSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const result = await recordPayment({
      invoiceId,
      paymentMethod: parsed.data.paymentMethod,
      transactionRef: parsed.data.transactionRef,
      amount: new Prisma.Decimal(parsed.data.amount),
      paidAt: new Date(),
      notes: parsed.data.notes,
    });
    if (!result.ok) return errorState(result.message);
    if (result.duplicate) return errorState("Referensi transaksi ini sudah pernah dicatat.");
  } catch (error) {
    return prismaErrorState(error, { uniqueField: "transactionRef", uniqueMessage: "Referensi transaksi ini sudah pernah dicatat." });
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { workOrderId: true, quotationId: true } });
  revalidateInvoices(invoice?.workOrderId, invoice?.quotationId);
  revalidatePath(`/invoices/${invoiceId}`);
  return { status: "success", message: "Pembayaran tercatat." };
}

/** Hapus invoice yang salah terbit. Hanya pemilik, hanya selama belum ada pembayaran sama sekali. */
export async function deleteInvoice(id: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize("owner");
  if (!auth.ok) return auth.state;

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id }, select: { workOrderId: true, quotationId: true } });
    if (!invoice) return errorState("Invoice tidak ditemukan.");
    // Kondisi di dalam where: invoice yang baru saja menerima pembayaran tidak ikut terhapus.
    const deleted = await prisma.invoice.deleteMany({ where: { id, status: "unpaid", paidAmount: 0, payments: { none: {} } } });
    if (deleted.count !== 1) return errorState("Invoice yang sudah menerima pembayaran tidak bisa dihapus.");
    revalidateInvoices(invoice.workOrderId, invoice.quotationId);
  } catch (error) {
    return prismaErrorState(error);
  }
  redirect("/invoices");
}
