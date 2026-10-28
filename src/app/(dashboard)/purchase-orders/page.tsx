import type { Metadata } from "next";
import Link from "next/link";
import { PackagePlus, Plus } from "lucide-react";
import { PurchaseOrderStatus, type Prisma } from "@/generated/prisma/client";
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
import { PO_STATUS_LABEL, PO_STATUS_TONE } from "@/lib/validation/purchase-order";

export const metadata: Metadata = { title: "PO Impor" };

const purchaseOrderList = {
  include: { supplier: { select: { companyName: true, country: true } }, _count: { select: { items: true } } },
} satisfies Prisma.PurchaseOrderDefaultArgs;
type PurchaseOrderRow = Prisma.PurchaseOrderGetPayload<typeof purchaseOrderList>;

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireRole("owner", "admin");

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = Object.values(PurchaseOrderStatus).find((value) => value === params.status);

  const where: Prisma.PurchaseOrderWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { poNumber: { contains: q, mode: "insensitive" } },
              { trackingNumber: { contains: q, mode: "insensitive" } },
              { supplier: { companyName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
      status ? { status } : {},
    ],
  };

  const total = await prisma.purchaseOrder.count({ where });
  const pageCount = pageCountFor(total);
  const page = Math.min(parsePage(params.page), pageCount);
  const orders = await prisma.purchaseOrder.findMany({
    where,
    ...purchaseOrderList,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const dash = <span className="text-slate-400">—</span>;
  const columns: Column<PurchaseOrderRow>[] = [
    {
      key: "number",
      header: "No. PO",
      hideOnCard: true,
      cell: (po) => (
        <Link href={`/purchase-orders/${po.id}`} className="whitespace-nowrap font-mono text-xs font-medium text-slate-900 underline decoration-amber-500 decoration-2 underline-offset-4">
          {po.poNumber}
        </Link>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (po) => (
        <>
          <span className="block font-medium text-slate-900">{po.supplier.companyName}</span>
          {po.supplier.country !== "Indonesia" && <span className="block text-xs text-slate-500">Impor · {po.supplier.country}</span>}
        </>
      ),
    },
    { key: "status", header: "Status", cell: (po) => <Badge tone={PO_STATUS_TONE[po.status]}>{PO_STATUS_LABEL[po.status]}</Badge> },
    { key: "eta", header: "Estimasi tiba", cell: (po) => (po.etaDate ? formatDateOnly(po.etaDate) : dash) },
    { key: "tracking", header: "Resi", cell: (po) => po.trackingNumber ?? dash },
    { key: "total", header: "Total", align: "right", cell: (po) => formatRupiah(po.totalAmount) },
  ];

  return (
    <>
      <PageHeader
        title="PO Impor"
        description="Pesanan sparepart ke supplier, nomor resi, dan estimasi tiba di gudang."
        actions={
          <Link href="/purchase-orders/new" className={buttonClass("primary")}>
            <Plus aria-hidden="true" className="size-4" />
            Buat PO
          </Link>
        }
      />

      <FilterBar basePath="/purchase-orders" query={q} searchPlaceholder="Cari nomor PO, resi, atau supplier" hasActiveFilters={q !== "" || Boolean(status)}>
        <select name="status" aria-label="Status" defaultValue={status ?? ""} className={`${inputClass} w-auto! sm:min-w-44`}>
          <option value="">Semua status</option>
          {Object.values(PurchaseOrderStatus).map((value) => (
            <option key={value} value={value}>
              {PO_STATUS_LABEL[value]}
            </option>
          ))}
        </select>
      </FilterBar>

      <DataList
        rows={orders}
        columns={columns}
        rowKey={(po) => po.id}
        caption="Daftar PO impor"
        tableFrom="lg"
        cardTitle={(po) => (
          <Link href={`/purchase-orders/${po.id}`} className="font-mono text-sm">
            {po.poNumber}
          </Link>
        )}
        cardSubtitle={(po) => `${po._count.items} jenis barang`}
        empty={
          <EmptyState
            icon={PackagePlus}
            title={q || status ? "PO tidak ditemukan" : "Belum ada PO"}
            description={q || status ? "Tidak ada PO yang cocok dengan pencarian atau filter ini." : "Buat PO pertama untuk mencatat pemesanan sparepart ke supplier."}
          />
        }
        actions={(po) => (
          <Link href={`/purchase-orders/${po.id}`} className={buttonClass("secondary", "sm")}>
            Buka
          </Link>
        )}
      />

      <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} basePath="/purchase-orders" params={{ q, status }} />
    </>
  );
}
