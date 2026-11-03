import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { InvoiceStatus, type Prisma } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { DataList, type Column } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Panel } from "@/components/ui/panel";
import { buttonClass, inputClass } from "@/components/ui/styles";
import { wibToday } from "@/lib/datetime";
import { formatDateOnly, formatRupiah } from "@/lib/format";
import { PAGE_SIZE, pageCountFor, parsePage } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { effectiveInvoiceStatus, INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from "@/lib/validation/invoice";

export const metadata: Metadata = { title: "Invoice" };

const invoiceList = {
  include: { customer: { select: { companyName: true } }, workOrder: { select: { woNumber: true } } },
} satisfies Prisma.InvoiceDefaultArgs;
type InvoiceRow = Prisma.InvoiceGetPayload<typeof invoiceList>;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireRole("owner", "admin");

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const today = wibToday();
  // "overdue" bukan nilai tersimpan di Fase 3: filter ini dihitung dari jatuh tempo.
  const statusParam = params.status === "overdue" ? "overdue" : Object.values(InvoiceStatus).find((value) => value === params.status);

  const statusWhere: Prisma.InvoiceWhereInput =
    statusParam === "overdue"
      ? { status: { in: ["unpaid", "partially_paid", "overdue"] }, dueDate: { lt: today } }
      : statusParam === "unpaid" || statusParam === "partially_paid"
        ? { status: statusParam, dueDate: { gte: today } }
        : statusParam
          ? { status: statusParam }
          : {};

  const where: Prisma.InvoiceWhereInput = {
    AND: [
      q ? { OR: [{ invoiceNumber: { contains: q, mode: "insensitive" } }, { customer: { companyName: { contains: q, mode: "insensitive" } } }] } : {},
      statusWhere,
    ],
  };

  const total = await prisma.invoice.count({ where });
  const pageCount = pageCountFor(total);
  const page = Math.min(parsePage(params.page), pageCount);
  const [invoices, unbilled] = await Promise.all([
    prisma.invoice.findMany({ where, ...invoiceList, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    // WO selesai yang punya penawaran tetapi belum ditagih.
    prisma.workOrder.findMany({
      where: { status: "completed", quotationId: { not: null }, invoice: null },
      orderBy: { completedAt: "asc" },
      select: { id: true, woNumber: true, completedAt: true, customer: { select: { companyName: true } }, quotation: { select: { grandTotal: true } } },
    }),
  ]);

  const columns: Column<InvoiceRow>[] = [
    {
      key: "number",
      header: "No. invoice",
      hideOnCard: true,
      cell: (i) => (
        <Link href={`/invoices/${i.id}`} className="whitespace-nowrap font-mono text-xs font-medium text-slate-900 underline decoration-amber-500 decoration-2 underline-offset-4">
          {i.invoiceNumber}
        </Link>
      ),
    },
    { key: "customer", header: "Customer", cell: (i) => <span className="font-medium text-slate-900">{i.customer.companyName}</span> },
    {
      key: "status",
      header: "Status",
      cell: (i) => {
        const effective = effectiveInvoiceStatus(i, today);
        return <Badge tone={INVOICE_STATUS_TONE[effective]}>{INVOICE_STATUS_LABEL[effective]}</Badge>;
      },
    },
    { key: "due", header: "Jatuh tempo", cell: (i) => formatDateOnly(i.dueDate) },
    { key: "total", header: "Total", align: "right", cell: (i) => formatRupiah(i.totalAmount) },
  ];

  const statusOptions = [...Object.values(InvoiceStatus).filter((value) => value !== "overdue"), "overdue" as const];

  return (
    <>
      <PageHeader title="Invoice" description="Faktur penagihan. Jatuh tempo mengikuti TOP masing-masing klien." />

      {unbilled.length > 0 && (
        <div className="mb-6">
          <Panel title={`Work order selesai, belum ditagih (${unbilled.length})`}>
            <ul className="divide-y divide-slate-100">
              {unbilled.map((wo) => (
                <li key={wo.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{wo.customer.companyName}</p>
                    <p className="text-sm text-slate-600">
                      <span className="font-mono text-xs">{wo.woNumber}</span> · {formatRupiah(wo.quotation?.grandTotal ?? 0)}
                    </p>
                  </div>
                  <Link href={`/work-orders/${wo.id}`} className={buttonClass("secondary", "sm")}>
                    Buka untuk terbitkan
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <FilterBar basePath="/invoices" query={q} searchPlaceholder="Cari nomor atau customer" hasActiveFilters={q !== "" || Boolean(statusParam)}>
        <select name="status" aria-label="Status" defaultValue={statusParam ?? ""} className={`${inputClass} w-auto! sm:min-w-44`}>
          <option value="">Semua status</option>
          {statusOptions.map((value) => (
            <option key={value} value={value}>
              {INVOICE_STATUS_LABEL[value]}
            </option>
          ))}
        </select>
      </FilterBar>

      <DataList
        rows={invoices}
        columns={columns}
        rowKey={(row) => row.id}
        caption="Daftar invoice"
        tableFrom="lg"
        cardTitle={(row) => (
          <Link href={`/invoices/${row.id}`} className="font-mono text-sm">
            {row.invoiceNumber}
          </Link>
        )}
        cardSubtitle={(row) => row.workOrder.woNumber}
        empty={
          <EmptyState
            icon={Receipt}
            title={q || statusParam ? "Invoice tidak ditemukan" : "Belum ada invoice"}
            description={q || statusParam ? "Tidak ada invoice yang cocok dengan pencarian atau filter ini." : "Invoice dibuat dari work order yang sudah selesai."}
          />
        }
        actions={(row) => (
          <Link href={`/invoices/${row.id}`} className={buttonClass("secondary", "sm")}>
            Buka
          </Link>
        )}
      />

      <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} basePath="/invoices" params={{ q, status: statusParam }} />
    </>
  );
}
