import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Field, FormDialog } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentLines } from "@/components/ui/document-lines";
import { Panel } from "@/components/ui/panel";
import { buttonClass } from "@/components/ui/styles";
import { wibToday } from "@/lib/datetime";
import { formatDateOnly, formatDateTime, formatRupiah } from "@/lib/format";
import { whatsappNumber } from "@/lib/approval-link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { effectiveInvoiceStatus, INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE, PAYMENT_METHODS } from "@/lib/validation/invoice";
import { deleteInvoice, recordPaymentAction } from "../actions";

export const metadata: Metadata = { title: "Detail Invoice" };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("owner", "admin");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      workOrder: { select: { id: true, woNumber: true } },
      quotation: { select: { id: true, quotationNumber: true, items: { orderBy: { id: "asc" } } } },
      payments: { orderBy: { paidAt: "desc" }, select: { id: true, paymentMethod: true, transactionRef: true, amount: true, paidAt: true, notes: true } },
      _count: { select: { payments: true } },
    },
  });
  if (!invoice) notFound();

  const status = effectiveInvoiceStatus(invoice, wibToday());
  const hasPpn = Number(invoice.taxPpn) > 0;
  const hasDiscount = Number(invoice.discount) > 0;
  const outstanding = Number(invoice.totalAmount) - Number(invoice.paidAmount);
  const deletable = user.role === "owner" && invoice.status === "unpaid" && Number(invoice.paidAmount) === 0 && invoice._count.payments === 0;
  const payable = status !== "paid";
  const outstandingLabel = formatRupiah(outstanding);
  const reminderMessage = `Halo ${invoice.customer.picName}, ini pengingat dari PT Forklift Solusindo Utama: invoice ${invoice.invoiceNumber} sebesar ${outstandingLabel} jatuh tempo pada ${formatDateOnly(invoice.dueDate)}. Mohon kesediaannya untuk melakukan pembayaran. Terima kasih.`;
  const reminderUrl = `https://wa.me/${whatsappNumber(invoice.customer.picPhone)}?text=${encodeURIComponent(reminderMessage)}`;

  return (
    <>
      <Link href="/invoices" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Daftar invoice
      </Link>

      <PageHeader
        title={invoice.invoiceNumber}
        description={invoice.customer.companyName}
        actions={
          <>
            <Badge tone={INVOICE_STATUS_TONE[status]}>{INVOICE_STATUS_LABEL[status]}</Badge>
            <a href={`/invoices/${id}/pdf`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
              <Download aria-hidden="true" className="size-4" />
              PDF
            </a>
            {payable && (
              <a href={reminderUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
                <MessageCircle aria-hidden="true" className="size-4" />
                Ingatkan
              </a>
            )}
            {payable && (
              <FormDialog
                triggerLabel="Catat pembayaran"
                triggerIcon="plus"
                triggerVariant="primary"
                title="Catat pembayaran"
                description={`Sisa tagihan ${outstandingLabel}. Pembayaran melebihi sisa tagihan ditolak.`}
                submitLabel="Simpan pembayaran"
                action={recordPaymentAction.bind(null, id)}
              >
                <Field name="amount" label="Jumlah (Rp)" kind="number" required min={1} placeholder={String(Math.round(outstanding))} hint="Boleh kurang dari sisa tagihan (pembayaran sebagian)." />
                <Field name="paymentMethod" label="Metode pembayaran" kind="select" required options={PAYMENT_METHODS.map((method) => ({ value: method, label: method }))} />
                <Field name="transactionRef" label="Referensi transaksi" placeholder="Mis. nomor VA / ID transfer (opsional)" hint="Bila diisi harus unik — dipakai mencegah pencatatan ganda." />
                <Field name="notes" label="Catatan" kind="textarea" rows={2} placeholder="Opsional" />
              </FormDialog>
            )}
            {deletable && (
              <FormDialog
                triggerLabel="Hapus"
                triggerIcon="trash"
                triggerVariant="ghost"
                title="Hapus invoice?"
                submitLabel="Ya, hapus"
                destructive
                action={deleteInvoice.bind(null, id)}
              >
                <p className="text-sm text-slate-700">
                  <strong>{invoice.invoiceNumber}</strong> akan dihapus. Work order bisa ditagih ulang setelahnya.
                </p>
              </FormDialog>
            )}
          </>
        }
      />

      <div className="space-y-6">
        <Panel title="Informasi">
          <dl className="grid gap-x-6 gap-y-4 p-4 text-sm sm:grid-cols-2 sm:p-5">
            <Item label="Customer">
              <span className="block font-medium text-slate-900">{invoice.customer.companyName}</span>
              <span className="block text-slate-600">{invoice.customer.address}</span>
            </Item>
            <Item label="Kontak">
              <span className="block font-medium text-slate-900">{invoice.customer.picName}</span>
              <span className="block text-slate-600">{invoice.customer.picPhone}</span>
            </Item>
            <Item label="Tanggal terbit">{formatDateOnly(invoice.issueDate)}</Item>
            <Item label={`Jatuh tempo (TOP ${invoice.customer.topDays} hari)`}>{formatDateOnly(invoice.dueDate)}</Item>
            <Item label="Penawaran">
              <Link href={`/quotations/${invoice.quotation.id}`} className="underline decoration-amber-500 decoration-2 underline-offset-4">{invoice.quotation.quotationNumber}</Link>
            </Item>
            <Item label="Work order">
              <Link href={`/work-orders/${invoice.workOrder.id}`} className="underline decoration-amber-500 decoration-2 underline-offset-4">{invoice.workOrder.woNumber}</Link>
            </Item>
          </dl>
        </Panel>

        <Panel title="Rincian tagihan">
          <DocumentLines
            caption="Rincian tagihan"
            lines={invoice.quotation.items.map((item) => ({ ...item, kind: item.itemType === "labor" ? "Jasa" : "Barang" }))}
            totals={[
              { label: "Subtotal", value: formatRupiah(invoice.subtotal) },
              ...(hasDiscount ? [{ label: "Diskon", value: `- ${formatRupiah(invoice.discount)}` }] : []),
              hasPpn ? { label: "PPN 11%", value: formatRupiah(invoice.taxPpn) } : { label: "PPN", value: "Tidak dikenakan", muted: true },
              { label: "Total tagihan", value: formatRupiah(invoice.totalAmount), strong: true },
              ...(Number(invoice.paidAmount) > 0
                ? [{ label: "Sudah dibayar", value: formatRupiah(invoice.paidAmount) }, { label: "Sisa", value: formatRupiah(outstanding), strong: true }]
                : []),
            ]}
          />
        </Panel>

        <Panel title={`Riwayat pembayaran${invoice.payments.length > 0 ? ` (${invoice.payments.length})` : ""}`}>
          {invoice.payments.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-600 sm:px-5">Belum ada pembayaran tercatat untuk invoice ini.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{formatRupiah(payment.amount)} <span className="font-normal text-slate-500">via {payment.paymentMethod}</span></p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(payment.paidAt)}
                      {payment.transactionRef ? <> · <span className="font-mono">{payment.transactionRef}</span></> : null}
                      {payment.notes ? <> · {payment.notes}</> : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{children}</dd>
    </div>
  );
}
