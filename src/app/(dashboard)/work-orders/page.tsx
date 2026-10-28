import type { Metadata } from "next";
import clsx from "clsx";
import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { WorkOrderStatus, type Prisma } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { DataList, type Column } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { buttonClass, inputClass } from "@/components/ui/styles";
import { formatDateTime } from "@/lib/format";
import { PAGE_SIZE, pageCountFor, parsePage } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { WO_STATUS_LABEL, WO_STATUS_TONE } from "@/lib/validation/work-order";

export const metadata: Metadata = { title: "Work Order" };

const workOrderList = {
  include: { customer: { select: { companyName: true } }, mechanic: { select: { name: true } } },
} satisfies Prisma.WorkOrderDefaultArgs;
type WorkOrderRow = Prisma.WorkOrderGetPayload<typeof workOrderList>;

const ACTIVE: WorkOrderStatus[] = ["scheduled", "in_progress"];

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tab?: string; page?: string }>;
}) {
  const user = await requireUser();
  const isMechanic = user.role === "mechanic";
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  // Mekanik: dua tab sederhana (aktif / riwayat). Pemilik & admin: filter status lengkap.
  const tab = params.tab === "riwayat" ? "riwayat" : "aktif";
  const status = Object.values(WorkOrderStatus).find((value) => value === params.status);

  const where: Prisma.WorkOrderWhereInput = {
    AND: [
      // Mekanik hanya pernah melihat WO miliknya; filter ini selalu dipasang, bukan opsional.
      isMechanic ? { mechanicId: user.id } : {},
      isMechanic ? { status: tab === "aktif" ? { in: ACTIVE } : { in: ["completed", "cancelled"] } } : status ? { status } : {},
      q
        ? {
            OR: [
              { woNumber: { contains: q, mode: "insensitive" } },
              { unitModel: { contains: q, mode: "insensitive" } },
              { customer: { companyName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const total = await prisma.workOrder.count({ where });
  const pageCount = pageCountFor(total);
  const page = Math.min(parsePage(params.page), pageCount);
  const orders = await prisma.workOrder.findMany({
    where,
    ...workOrderList,
    orderBy: isMechanic && tab === "aktif" ? { scheduledAt: "asc" } : { scheduledAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const columns: Column<WorkOrderRow>[] = [
    {
      key: "number",
      header: "No. WO",
      hideOnCard: true,
      cell: (wo) => (
        <Link href={`/work-orders/${wo.id}`} className="whitespace-nowrap font-mono text-xs font-medium text-slate-900 underline decoration-amber-500 decoration-2 underline-offset-4">
          {wo.woNumber}
        </Link>
      ),
    },
    { key: "customer", header: "Customer", cell: (wo) => <span className="font-medium text-slate-900">{wo.customer.companyName}</span> },
    { key: "unit", header: "Unit", cell: (wo) => wo.unitModel },
    { key: "schedule", header: "Jadwal", cell: (wo) => formatDateTime(wo.scheduledAt) },
    ...(isMechanic ? [] : [{ key: "mechanic", header: "Mekanik", cell: (wo: WorkOrderRow) => wo.mechanic.name }]),
    { key: "status", header: "Status", cell: (wo) => <Badge tone={WO_STATUS_TONE[wo.status]}>{WO_STATUS_LABEL[wo.status]}</Badge> },
  ];

  return (
    <>
      <PageHeader
        title={isMechanic ? "Tugas saya" : "Work Order"}
        description={isMechanic ? "Pekerjaan servis yang ditugaskan kepada Anda." : "Penugasan mekanik ke pabrik klien dan progres pekerjaannya."}
        actions={
          !isMechanic && (
            <Link href="/work-orders/new" className={buttonClass("primary")}>
              <Plus aria-hidden="true" className="size-4" />
              Buat work order
            </Link>
          )
        }
      />

      {isMechanic && (
        <nav aria-label="Daftar tugas" className="mb-4 flex gap-2">
          {(["aktif", "riwayat"] as const).map((value) => (
            <Link
              key={value}
              href={value === "aktif" ? "/work-orders" : "/work-orders?tab=riwayat"}
              aria-current={tab === value ? "page" : undefined}
              className={clsx(
                "inline-flex h-10 items-center rounded-full px-4 text-sm font-medium",
                tab === value ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {value === "aktif" ? "Aktif" : "Riwayat"}
            </Link>
          ))}
        </nav>
      )}

      <FilterBar
        basePath="/work-orders"
        query={q}
        searchPlaceholder="Cari nomor WO, customer, atau unit"
        hasActiveFilters={q !== "" || Boolean(status)}
      >
        {isMechanic ? (
          <input type="hidden" name="tab" value={tab} />
        ) : (
          <select name="status" aria-label="Status" defaultValue={status ?? ""} className={`${inputClass} w-auto! sm:min-w-44`}>
            <option value="">Semua status</option>
            {Object.values(WorkOrderStatus).map((value) => (
              <option key={value} value={value}>
                {WO_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        )}
      </FilterBar>

      <DataList
        rows={orders}
        columns={columns}
        rowKey={(wo) => wo.id}
        caption="Daftar work order"
        tableFrom="lg"
        cardTitle={(wo) => (
          <Link href={`/work-orders/${wo.id}`} className="font-mono text-sm">
            {wo.woNumber}
          </Link>
        )}
        cardSubtitle={(wo) => wo.customer.companyName}
        empty={
          <EmptyState
            icon={Wrench}
            title={q || status ? "Work order tidak ditemukan" : isMechanic ? (tab === "aktif" ? "Tidak ada tugas aktif" : "Belum ada riwayat") : "Belum ada work order"}
            description={
              q || status
                ? "Tidak ada work order yang cocok dengan pencarian atau filter ini."
                : isMechanic
                  ? "Tugas baru dari admin akan muncul di sini."
                  : "Buat work order pertama untuk menugaskan mekanik ke pabrik klien."
            }
          />
        }
        actions={(wo) => (
          <Link href={`/work-orders/${wo.id}`} className={buttonClass(isMechanic && wo.status !== "completed" ? "primary" : "secondary", "sm")}>
            Buka
          </Link>
        )}
      />

      <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} basePath="/work-orders" params={{ q, status, tab: isMechanic && tab === "riwayat" ? tab : undefined }} />
    </>
  );
}
