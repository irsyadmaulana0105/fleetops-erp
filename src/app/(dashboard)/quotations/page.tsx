import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { QuotationStatus, type Prisma } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { DataList, type Column } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { buttonClass, inputClass } from "@/components/ui/styles";
import { formatDateOnly, formatRupiah } from "@/lib/format";
import { PAGE_SIZE, pageCountFor, parsePage } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { QUOTATION_STATUS_LABEL, QUOTATION_STATUS_TONE } from "@/lib/validation/quotation";

export const metadata: Metadata = { title: "Penawaran" };

const quotationList = {
  include: { customer: { select: { companyName: true } }, _count: { select: { items: true } } },
} satisfies Prisma.QuotationDefaultArgs;
type QuotationRow = Prisma.QuotationGetPayload<typeof quotationList>;

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireRole("owner", "admin");

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = Object.values(QuotationStatus).find((value) => value === params.status);

  const where: Prisma.QuotationWhereInput = {
    AND: [
      q ? { OR: [{ quotationNumber: { contains: q, mode: "insensitive" } }, { customer: { companyName: { contains: q, mode: "insensitive" } } }] } : {},
      status ? { status } : {},
    ],
  };

  const total = await prisma.quotation.count({ where });
  const pageCount = pageCountFor(total);
  const page = Math.min(parsePage(params.page), pageCount);
  const quotations = await prisma.quotation.findMany({
    where,
    ...quotationList,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const columns: Column<QuotationRow>[] = [
    {
      key: "number",
      header: "No. penawaran",
      hideOnCard: true,
      cell: (q) => (
        <Link href={`/quotations/${q.id}`} className="whitespace-nowrap font-mono text-xs font-medium text-slate-900 underline decoration-amber-500 decoration-2 underline-offset-4">
          {q.quotationNumber}
        </Link>
      ),
    },
    { key: "customer", header: "Customer", cell: (q) => <span className="font-medium text-slate-900">{q.customer.companyName}</span> },
    { key: "status", header: "Status", cell: (q) => <Badge tone={QUOTATION_STATUS_TONE[q.status]}>{QUOTATION_STATUS_LABEL[q.status]}</Badge> },
    { key: "valid", header: "Berlaku sampai", cell: (q) => formatDateOnly(q.validUntil) },
    { key: "total", header: "Total", align: "right", cell: (q) => formatRupiah(q.grandTotal) },
  ];

  return (
    <>
      <PageHeader
        title="Penawaran"
        description="Buat penawaran, kirim tautan persetujuan ke klien, dan cetak PDF ber-kop surat."
        actions={
          <Link href="/quotations/new" className={buttonClass("primary")}>
            <Plus aria-hidden="true" className="size-4" />
            Buat penawaran
          </Link>
        }
      />

      <FilterBar basePath="/quotations" query={q} searchPlaceholder="Cari nomor atau customer" hasActiveFilters={q !== "" || Boolean(status)}>
        <select name="status" aria-label="Status" defaultValue={status ?? ""} className={`${inputClass} w-auto! sm:min-w-44`}>
          <option value="">Semua status</option>
          {Object.values(QuotationStatus).map((value) => (
            <option key={value} value={value}>
              {QUOTATION_STATUS_LABEL[value]}
            </option>
          ))}
        </select>
      </FilterBar>

      <DataList
        rows={quotations}
        columns={columns}
        rowKey={(row) => row.id}
        caption="Daftar penawaran"
        tableFrom="lg"
        cardTitle={(row) => (
          <Link href={`/quotations/${row.id}`} className="font-mono text-sm">
            {row.quotationNumber}
          </Link>
        )}
        cardSubtitle={(row) => `${row._count.items} baris`}
        empty={
          <EmptyState
            icon={FileText}
            title={q || status ? "Penawaran tidak ditemukan" : "Belum ada penawaran"}
            description={q || status ? "Tidak ada penawaran yang cocok dengan pencarian atau filter ini." : "Buat penawaran pertama untuk klien."}
          />
        }
        actions={(row) => (
          <Link href={`/quotations/${row.id}`} className={buttonClass("secondary", "sm")}>
            Buka
          </Link>
        )}
      />

      <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} basePath="/quotations" params={{ q, status }} />
    </>
  );
}
