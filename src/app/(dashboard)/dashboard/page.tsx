import type { Metadata } from "next";
import Link from "next/link";
import { PackageCheck, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatStrip, type Stat } from "@/components/ui/stat-strip";
import { startOfWibDay } from "@/lib/datetime";
import { formatDateTime } from "@/lib/format";
import { WO_STATUS_LABEL, WO_STATUS_TONE } from "@/lib/validation/work-order";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

const LOW_STOCK_PREVIEW = 5;

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name.split(" ")[0];
  const seesWarehouse = user.role === "owner" || user.role === "admin";

  // Mekanik tidak melihat data gudang; query hanya dijalankan untuk peran yang berhak.
  const [lowStockCount, lowStockItems, sparepartKinds] = seesWarehouse
    ? await Promise.all([
        prisma.sparepart.count({ where: { stock: { lte: prisma.sparepart.fields.minStock } } }),
        prisma.sparepart.findMany({
          where: { stock: { lte: prisma.sparepart.fields.minStock } },
          orderBy: [{ stock: "asc" }, { name: "asc" }],
          take: LOW_STOCK_PREVIEW,
        }),
        prisma.sparepart.count(),
      ])
    : [0, [], 0];

  // Pekerjaan hari ini (WIB) ditambah yang masih berjalan. Mekanik hanya melihat miliknya sendiri.
  const dayStart = startOfWibDay();
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const todaysWorkOrders = await prisma.workOrder.findMany({
    where: {
      ...(user.role === "mechanic" ? { mechanicId: user.id } : {}),
      OR: [{ scheduledAt: { gte: dayStart, lt: dayEnd }, status: { not: "cancelled" } }, { status: "in_progress" }],
    },
    include: { customer: { select: { companyName: true } } },
    orderBy: { scheduledAt: "asc" },
    take: 8,
  });

  // Angka keuangan belum dihubungkan (Fase 3–4): null tampil sebagai "—", bukan angka karangan.
  const stats: Stat[] =
    user.role === "owner"
      ? [
          { label: "Omset bulan ini", value: null, note: "Tersedia setelah modul invoice" },
          { label: "Piutang berjalan", value: null, note: "Tersedia setelah modul invoice" },
          { label: "Invoice lewat jatuh tempo", value: null, note: "Tersedia setelah modul invoice" },
          { label: "Sparepart stok menipis", value: String(lowStockCount), note: `dari ${sparepartKinds} jenis barang` },
        ]
      : user.role === "admin"
        ? [
            { label: "Sparepart stok menipis", value: String(lowStockCount), note: "Perlu diisi ulang" },
            { label: "Jenis sparepart", value: String(sparepartKinds), note: "Terdaftar di gudang" },
          ]
        : [];

  return (
    <>
      <PageHeader title={`Selamat datang, ${firstName}`} description="Ringkasan operasional servis dan sparepart hari ini." />

      <div className="space-y-6">
        {stats.length > 0 && <StatStrip stats={stats} />}

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Work order hari ini">
            {todaysWorkOrders.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="Tidak ada work order hari ini"
                description={user.role === "mechanic" ? "Tugas baru dari admin akan muncul di sini." : "Jadwal servis dan penugasan mekanik hari ini akan tampil di sini."}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {todaysWorkOrders.map((wo) => (
                  <li key={wo.id}>
                    <Link href={`/work-orders/${wo.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{wo.customer.companyName}</p>
                        <p className="truncate text-xs text-slate-500">
                          <span className="font-mono">{wo.woNumber}</span> · {wo.unitModel} · {formatDateTime(wo.scheduledAt)}
                        </p>
                      </div>
                      <Badge tone={WO_STATUS_TONE[wo.status]}>{WO_STATUS_LABEL[wo.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {seesWarehouse && (
            <Panel title="Stok perlu diisi ulang">
              {lowStockItems.length === 0 ? (
                <EmptyState
                  icon={PackageCheck}
                  title="Stok aman"
                  description="Tidak ada sparepart yang stoknya sudah di batas minimum."
                />
              ) : (
                <>
                  <ul className="divide-y divide-slate-100">
                    {lowStockItems.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                          <p className="font-mono text-xs text-slate-500">{item.sku}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-sm">
                          <Badge tone="danger">{item.stock === 0 ? "Habis" : "Menipis"}</Badge>
                          <span className="font-medium text-slate-900">
                            {item.stock} <span className="font-normal text-slate-500">/ min {item.minStock}</span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {lowStockCount > LOW_STOCK_PREVIEW && (
                    <div className="border-t border-slate-100 px-4 py-3 text-sm sm:px-5">
                      <Link href="/spareparts?low=1" className="font-medium text-slate-900 underline decoration-amber-500 decoration-2 underline-offset-4">
                        Lihat semua {lowStockCount} barang
                      </Link>
                    </div>
                  )}
                </>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
