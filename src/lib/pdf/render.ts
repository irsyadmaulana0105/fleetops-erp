import { getCompany } from "@/lib/company";
import { prisma } from "@/lib/prisma";
import { rp } from "./builder";
import { renderInvoicePdf, renderQuotationPdf, type PdfLine } from "./documents";

const lineOf = (item: { description: string; qty: number; unitPrice: { toString(): string }; subtotal: { toString(): string } }): PdfLine => ({
  description: item.description,
  qty: item.qty,
  unitPrice: rp(item.unitPrice),
  subtotal: rp(item.subtotal),
});

/** PDF penawaran dari database. Dipakai halaman admin dan halaman persetujuan klien. */
export async function quotationPdf(id: number): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const quotation = await prisma.quotation.findUnique({ where: { id }, include: { customer: true, items: { orderBy: { id: "asc" } } } });
  if (!quotation) return null;
  const bytes = await renderQuotationPdf({
    company: getCompany(),
    number: quotation.quotationNumber,
    customer: quotation.customer,
    issuedAt: new Date(Date.UTC(quotation.createdAt.getUTCFullYear(), quotation.createdAt.getUTCMonth(), quotation.createdAt.getUTCDate())),
    validUntil: quotation.validUntil,
    lines: quotation.items.map(lineOf),
    totals: { subtotal: rp(quotation.subtotal), discount: rp(quotation.discount), taxPpn: rp(quotation.taxPpn), total: rp(quotation.grandTotal) },
    notes: quotation.notes,
  });
  return { bytes, filename: `${quotation.quotationNumber.replace(/\//g, "-")}.pdf` };
}

export async function invoicePdf(id: number): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      quotation: { include: { items: { orderBy: { id: "asc" } } } },
      workOrder: { select: { woNumber: true } },
    },
  });
  if (!invoice) return null;
  const paid = Number(invoice.paidAmount) > 0 ? rp(invoice.paidAmount) : null;
  const bytes = await renderInvoicePdf({
    company: getCompany(),
    number: invoice.invoiceNumber,
    customer: invoice.customer,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    topDays: invoice.customer.topDays,
    references: [invoice.quotation.quotationNumber, invoice.workOrder.woNumber],
    lines: invoice.quotation.items.map(lineOf),
    totals: { subtotal: rp(invoice.subtotal), discount: rp(invoice.discount), taxPpn: rp(invoice.taxPpn), total: rp(invoice.totalAmount) },
    paid,
  });
  return { bytes, filename: `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf` };
}

export function pdfResponse(file: { bytes: Uint8Array; filename: string }, cache = "private, no-store"): Response {
  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${file.filename}"`,
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
