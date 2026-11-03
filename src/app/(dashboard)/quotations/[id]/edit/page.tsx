import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageForm } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { toDateInput } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { EDITABLE_QUOTATION_STATUSES } from "@/lib/validation/quotation";
import { updateQuotation } from "../../actions";
import { QuotationHeaderFields } from "../../quotation-header-fields";
import { QuotationItemsEditor } from "../../quotation-items-editor";

export const metadata: Metadata = { title: "Ubah Penawaran" };

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("owner", "admin");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [quotation, customers, spareparts] = await Promise.all([
    prisma.quotation.findUnique({ where: { id }, include: { items: { orderBy: { id: "asc" } } } }),
    prisma.customer.findMany({ orderBy: { companyName: "asc" }, select: { id: true, companyName: true } }),
    prisma.sparepart.findMany({ orderBy: { name: "asc" }, select: { id: true, sku: true, name: true, unit: true, sellPrice: true, stock: true } }),
  ]);
  if (!quotation) notFound();
  if (!EDITABLE_QUOTATION_STATUSES.includes(quotation.status)) redirect(`/quotations/${id}`);

  return (
    <>
      <Link href={`/quotations/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {quotation.quotationNumber}
      </Link>
      <PageHeader title={`Ubah ${quotation.quotationNumber}`} description="Setelah disimpan, kirim ulang ke klien untuk mendapatkan tautan persetujuan baru." />
      <PageForm action={updateQuotation.bind(null, id)} submitLabel="Simpan perubahan" cancelHref={`/quotations/${id}`}>
        <QuotationHeaderFields
          customers={customers}
          defaults={{ customerId: quotation.customerId, validUntil: toDateInput(quotation.validUntil), notes: quotation.notes }}
        />
        <QuotationItemsEditor
          spareparts={spareparts.map((part) => ({ ...part, sellPrice: Number(part.sellPrice) }))}
          discount={Number(quotation.discount)}
          applyPpn={Number(quotation.taxPpn) > 0}
          defaults={quotation.items.map((item) => ({
            itemType: item.itemType,
            sparepartId: item.sparepartId,
            description: item.description,
            qty: item.qty,
            unitPrice: Number(item.unitPrice),
          }))}
        />
      </PageForm>
    </>
  );
}
