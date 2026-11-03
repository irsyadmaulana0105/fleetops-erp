import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageForm } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { addDays, toDateInput, wibToday } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createQuotation } from "../actions";
import { QuotationHeaderFields } from "../quotation-header-fields";
import { QuotationItemsEditor } from "../quotation-items-editor";

export const metadata: Metadata = { title: "Buat Penawaran" };

export default async function NewQuotationPage() {
  await requireRole("owner", "admin");

  const [customers, spareparts] = await Promise.all([
    prisma.customer.findMany({ orderBy: { companyName: "asc" }, select: { id: true, companyName: true } }),
    prisma.sparepart.findMany({ orderBy: { name: "asc" }, select: { id: true, sku: true, name: true, unit: true, sellPrice: true, stock: true } }),
  ]);

  return (
    <>
      <Link href="/quotations" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Daftar penawaran
      </Link>
      <PageHeader title="Buat penawaran" description="Disimpan sebagai draft. Kirim ke klien setelah isinya sudah benar." />

      {customers.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          Belum ada customer. <Link href="/customers" className="font-medium underline">Tambahkan customer</Link> dulu.
        </p>
      ) : (
        <PageForm action={createQuotation} submitLabel="Simpan draft penawaran" cancelHref="/quotations">
          <QuotationHeaderFields customers={customers} defaults={{ validUntil: toDateInput(addDays(wibToday(), 14)) }} />
          <QuotationItemsEditor spareparts={spareparts.map((part) => ({ ...part, sellPrice: Number(part.sellPrice) }))} />
        </PageForm>
      )}
    </>
  );
}
