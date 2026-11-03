import type { Metadata } from "next";
import { CheckCircle2, Download, FileX2, Hourglass, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocumentLines } from "@/components/ui/document-lines";
import { Field, FormDialog } from "@/components/ui/form";
import { ToastProvider } from "@/components/ui/toast";
import { getCompany } from "@/lib/company";
import { formatDateOnly, formatDateTime, formatRupiah } from "@/lib/format";
import { lookupApproval } from "@/lib/services/quotation";
import { QUOTATION_STATUS_LABEL, QUOTATION_STATUS_TONE } from "@/lib/validation/quotation";
import { customerDecision } from "./actions";

export const metadata: Metadata = { title: "Persetujuan Penawaran", robots: { index: false, follow: false } };

// Halaman ini bergantung pada status terbaru di database; jangan di-cache.
export const dynamic = "force-dynamic";

export default async function ApprovalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const company = getCompany();
  const lookup = await lookupApproval(token);

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-slate-50">
        <header className="border-b border-slate-200 bg-slate-900 text-white">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
            <span aria-hidden="true" className="h-6 w-1.5 rounded-sm bg-amber-500" />
            <p className="text-base font-semibold">{company.name}</p>
          </div>
        </header>

        <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:py-8">
          {lookup.state !== "ok" ? (
            <Unavailable expired={lookup.state === "expired"} company={company.name} phone={company.phone} />
          ) : (
            <Content token={token} lookup={lookup} />
          )}
        </main>
      </div>
    </ToastProvider>
  );
}

function Unavailable({ expired, company, phone }: { expired: boolean; company: string; phone: string }) {
  const Icon = expired ? Hourglass : FileX2;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-8">
      <Icon aria-hidden="true" className="mx-auto size-10 text-slate-400" />
      <h1 className="mt-3 text-lg font-semibold text-slate-900">{expired ? "Tautan sudah kedaluwarsa" : "Tautan tidak dapat dibuka"}</h1>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
        {expired
          ? `Masa berlaku tautan ini sudah habis. Silakan hubungi ${company}${phone ? ` di ${phone}` : ""} untuk mendapatkan tautan baru.`
          : `Tautan ini salah, sudah diganti dengan yang baru, atau penawarannya ditarik untuk revisi. Hubungi ${company}${phone ? ` di ${phone}` : ""} bila Anda membutuhkan bantuan.`}
      </p>
    </section>
  );
}

function Content({ token, lookup }: { token: string; lookup: Extract<Awaited<ReturnType<typeof lookupApproval>>, { state: "ok" }> }) {
  const { quotation, expiresAt } = lookup;
  const { status } = quotation;
  const open = status === "sent";
  const hasPpn = Number(quotation.taxPpn) > 0;
  const hasDiscount = Number(quotation.discount) > 0;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">Penawaran harga untuk</p>
          <h1 className="text-xl font-semibold text-slate-900">{quotation.customer.companyName}</h1>
          <p className="mt-0.5 font-mono text-sm text-slate-600">{quotation.quotationNumber}</p>
        </div>
        <Badge tone={QUOTATION_STATUS_TONE[status]}>{QUOTATION_STATUS_LABEL[status]}</Badge>
      </div>

      {status === "approved" && (
        <Banner tone="ok" icon={<CheckCircle2 aria-hidden="true" className="size-5" />}>
          Penawaran ini telah disetujui{quotation.approvedAt ? ` pada ${formatDateTime(quotation.approvedAt)}` : ""}. Terima kasih.
        </Banner>
      )}
      {status === "rejected" && (
        <Banner tone="neutral" icon={<XCircle aria-hidden="true" className="size-5" />}>
          Penawaran ini telah ditolak. Hubungi kami bila ingin penawaran baru.
        </Banner>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <DocumentLines
          caption="Rincian penawaran"
          lines={quotation.items.map((item) => ({ ...item, kind: item.itemType === "labor" ? "Jasa" : undefined }))}
          totals={[
            { label: "Subtotal", value: formatRupiah(quotation.subtotal) },
            ...(hasDiscount ? [{ label: "Diskon", value: `- ${formatRupiah(quotation.discount)}` }] : []),
            hasPpn ? { label: "PPN 11%", value: formatRupiah(quotation.taxPpn) } : { label: "PPN", value: "Tidak dikenakan", muted: true },
            { label: "Total", value: formatRupiah(quotation.grandTotal), strong: true },
          ]}
        />
      </section>

      <dl className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Berlaku sampai</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{formatDateOnly(quotation.validUntil)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Tautan berlaku sampai</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{formatDateTime(expiresAt)}</dd>
        </div>
        {quotation.notes && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">Catatan</dt>
            <dd className="mt-0.5 whitespace-pre-line text-slate-900">{quotation.notes}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <a href={`/approve/${token}/pdf`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50">
          <Download aria-hidden="true" className="size-4" />
          Unduh PDF
        </a>
      </div>

      {open && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5" aria-labelledby="decision-title">
          <h2 id="decision-title" className="text-base font-semibold text-slate-900">Keputusan Anda</h2>
          <p className="mt-1 text-sm text-slate-700">Silakan setujui penawaran ini, minta revisi, atau tolak.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <FormDialog
              triggerLabel="Setujui penawaran"
              triggerVariant="primary"
              title="Setujui penawaran ini?"
              submitLabel="Ya, setujui"
              action={customerDecision.bind(null, token, "approved")}
            >
              <p className="text-sm text-slate-700">
                Dengan menyetujui, Anda menerima penawaran <strong>{quotation.quotationNumber}</strong> senilai <strong>{formatRupiah(quotation.grandTotal)}</strong>.
              </p>
              <Field name="note" label="Catatan (opsional)" kind="textarea" rows={2} />
            </FormDialog>
            <FormDialog
              triggerLabel="Minta revisi"
              triggerVariant="secondary"
              title="Minta revisi"
              description="Tuliskan bagian yang perlu diubah. Kami akan mengirim penawaran terbaru."
              submitLabel="Kirim permintaan"
              action={customerDecision.bind(null, token, "revised")}
            >
              <Field name="note" label="Bagian yang perlu direvisi" kind="textarea" rows={4} required />
            </FormDialog>
            <FormDialog
              triggerLabel="Tolak"
              triggerVariant="ghost"
              title="Tolak penawaran ini?"
              submitLabel="Ya, tolak"
              destructive
              action={customerDecision.bind(null, token, "rejected")}
            >
              <Field name="note" label="Alasan (opsional)" kind="textarea" rows={3} />
            </FormDialog>
          </div>
        </section>
      )}

      {status === "revised" && (
        <Banner tone="neutral" icon={<RotateCcw aria-hidden="true" className="size-5" />}>
          Permintaan revisi sudah kami terima.
        </Banner>
      )}
    </>
  );
}

function Banner({ tone, icon, children }: { tone: "ok" | "neutral"; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div role="status" className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700"}`}>
      {icon}
      <p>{children}</p>
    </div>
  );
}
