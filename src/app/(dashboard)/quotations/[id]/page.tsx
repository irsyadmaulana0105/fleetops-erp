import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Pencil, Receipt, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentLines } from "@/components/ui/document-lines";
import { Panel } from "@/components/ui/panel";
import { buttonClass } from "@/components/ui/styles";
import { getBaseUrl, whatsappNumber } from "@/lib/approval-link";
import { formatDateOnly, formatDateTime, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { approvalTokenFor } from "@/lib/services/quotation";
import { EDITABLE_QUOTATION_STATUSES, QUOTATION_STATUS_LABEL, QUOTATION_STATUS_TONE } from "@/lib/validation/quotation";
import { decideManuallyAction, deleteQuotation, recallQuotationAction, regenerateLinkAction, sendQuotationAction } from "../actions";
import { SharePanel } from "./share-panel";

export const metadata: Metadata = { title: "Detail Penawaran" };

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("owner", "admin");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { sparepart: { select: { sku: true, unit: true } } }, orderBy: { id: "asc" } },
      workOrder: { select: { id: true, woNumber: true, status: true, invoice: { select: { id: true, invoiceNumber: true } } } },
    },
  });
  if (!quotation) notFound();

  const { status } = quotation;
  const editable = EDITABLE_QUOTATION_STATUSES.includes(status);
  const token = status === "sent" ? approvalTokenFor(quotation) : null;
  const expired = Boolean(quotation.approvalExpiresAt && quotation.approvalExpiresAt.getTime() < Date.now());
  const hasPpn = Number(quotation.taxPpn) > 0;
  const hasDiscount = Number(quotation.discount) > 0;

  let share: { url: string; whatsappUrl: string } | null = null;
  if (token) {
    const url = `${await getBaseUrl()}/approve/${token}`;
    const message =
      `Yth. ${quotation.customer.picName} (${quotation.customer.companyName}),\n\n` +
      `Berikut penawaran harga ${quotation.quotationNumber} sebesar ${formatRupiah(quotation.grandTotal)}. ` +
      `Mohon ditinjau dan diberi keputusan melalui tautan berikut (berlaku sampai ${quotation.approvalExpiresAt ? formatDateTime(quotation.approvalExpiresAt) : "-"}):\n${url}\n\nTerima kasih.`;
    share = { url, whatsappUrl: `https://wa.me/${whatsappNumber(quotation.customer.picPhone)}?text=${encodeURIComponent(message)}` };
  }

  return (
    <>
      <Link href="/quotations" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Daftar penawaran
      </Link>

      <PageHeader
        title={quotation.quotationNumber}
        description={quotation.customer.companyName}
        actions={<Badge tone={QUOTATION_STATUS_TONE[status]}>{QUOTATION_STATUS_LABEL[status]}</Badge>}
      />

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {editable && (
            <FormDialog
              triggerLabel={status === "revised" ? "Kirim ulang ke klien" : "Kirim ke klien"}
              triggerVariant="primary"
              title="Kirim penawaran ke klien?"
              submitLabel="Ya, kirim"
              action={sendQuotationAction.bind(null, id)}
            >
              <p className="text-sm text-slate-700">
                Penawaran akan dikunci dan tautan persetujuan dibuat (berlaku 14 hari). Isi tidak bisa diubah lagi kecuali ditarik untuk revisi.
              </p>
            </FormDialog>
          )}
          {editable && (
            <Link href={`/quotations/${id}/edit`} className={buttonClass("secondary")}>
              <Pencil aria-hidden="true" className="size-4" />
              Ubah isi
            </Link>
          )}
          <a href={`/quotations/${id}/pdf`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
            <Download aria-hidden="true" className="size-4" />
            Unduh PDF
          </a>
          {status === "sent" && (
            <>
              <FormDialog
                triggerLabel="Buat ulang tautan"
                triggerVariant="secondary"
                title="Buat ulang tautan?"
                submitLabel="Ya, buat ulang"
                action={regenerateLinkAction.bind(null, id)}
              >
                <p className="text-sm text-slate-700">Tautan lama langsung tidak berlaku. Kirim tautan yang baru ke klien.</p>
              </FormDialog>
              <FormDialog
                triggerLabel="Catat disetujui klien"
                triggerVariant="secondary"
                title="Catat penawaran disetujui?"
                submitLabel="Ya, disetujui"
                action={decideManuallyAction.bind(null, id, "approved")}
              >
                <p className="text-sm text-slate-700">Gunakan jika klien menyetujui lewat WhatsApp atau telepon. Penawaran menjadi final dan work order bisa dibuat.</p>
              </FormDialog>
              <FormDialog
                triggerLabel="Tarik untuk revisi"
                triggerVariant="ghost"
                title="Tarik penawaran untuk revisi?"
                submitLabel="Ya, tarik"
                action={recallQuotationAction.bind(null, id)}
              >
                <p className="text-sm text-slate-700">Tautan lama dimatikan dan isi penawaran bisa diubah lagi.</p>
              </FormDialog>
              <FormDialog
                triggerLabel="Catat ditolak klien"
                triggerVariant="ghost"
                title="Catat penawaran ditolak?"
                submitLabel="Ya, ditolak"
                destructive
                action={decideManuallyAction.bind(null, id, "rejected")}
              >
                <p className="text-sm text-slate-700">Penawaran menjadi final berstatus Ditolak.</p>
              </FormDialog>
            </>
          )}
          {status === "draft" && (
            <FormDialog triggerLabel="Hapus draft" triggerVariant="ghost" title="Hapus draft penawaran?" submitLabel="Ya, hapus" destructive action={deleteQuotation.bind(null, id)}>
              <p className="text-sm text-slate-700">Draft ini dihapus permanen beserta barisnya.</p>
            </FormDialog>
          )}
          {status === "approved" && !quotation.workOrder && (
            <Link href={`/work-orders/new?quotationId=${id}`} className={buttonClass("primary")}>
              <Wrench aria-hidden="true" className="size-4" />
              Buat work order
            </Link>
          )}
          {quotation.workOrder && (
            <Link href={`/work-orders/${quotation.workOrder.id}`} className={buttonClass("secondary")}>
              <Wrench aria-hidden="true" className="size-4" />
              {quotation.workOrder.woNumber}
            </Link>
          )}
          {quotation.workOrder?.invoice && (
            <Link href={`/invoices/${quotation.workOrder.invoice.id}`} className={buttonClass("secondary")}>
              <Receipt aria-hidden="true" className="size-4" />
              {quotation.workOrder.invoice.invoiceNumber}
            </Link>
          )}
        </div>

        {share && quotation.approvalExpiresAt && (
          <SharePanel url={share.url} whatsappUrl={share.whatsappUrl} expiresLabel={formatDateTime(quotation.approvalExpiresAt)} expired={expired} />
        )}

        {quotation.responseNote && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900">{status === "revised" ? "Permintaan revisi" : "Catatan keputusan"}</h2>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{quotation.responseNote}</p>
          </section>
        )}

        <Panel title="Ringkasan">
          <dl className="grid gap-x-6 gap-y-4 p-4 text-sm sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
            <Summary label="Customer" value={quotation.customer.companyName} />
            <Summary label="Kontak" value={`${quotation.customer.picName} · ${quotation.customer.picPhone}`} />
            <Summary label="Berlaku sampai" value={formatDateOnly(quotation.validUntil)} />
            <Summary label="Dibuat" value={formatDateTime(quotation.createdAt)} />
            {quotation.approvedAt && <Summary label="Disetujui" value={formatDateTime(quotation.approvedAt)} />}
            {quotation.notes && <Summary label="Catatan untuk klien" value={quotation.notes} wide />}
          </dl>
        </Panel>

        <Panel title={`Rincian (${quotation.items.length})`}>
          <DocumentLines
            caption={`Rincian ${quotation.quotationNumber}`}
            lines={quotation.items.map((item) => ({ ...item, kind: item.itemType === "labor" ? "Jasa" : "Barang", unit: item.sparepart?.unit }))}
            totals={[
              { label: "Subtotal", value: formatRupiah(quotation.subtotal) },
              ...(hasDiscount ? [{ label: "Diskon", value: `- ${formatRupiah(quotation.discount)}` }] : []),
              hasPpn ? { label: "PPN 11%", value: formatRupiah(quotation.taxPpn) } : { label: "PPN", value: "Tidak dikenakan", muted: true },
              { label: "Total", value: formatRupiah(quotation.grandTotal), strong: true },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}

function Summary({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2 lg:col-span-4" : ""}`}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line break-words font-medium text-slate-900">{value}</dd>
    </div>
  );
}
