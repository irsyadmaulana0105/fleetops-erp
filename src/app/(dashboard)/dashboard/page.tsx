import type { Metadata } from "next";
import Link from "next/link";
import { PackageCheck, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatStrip, type Stat } from "@/components/ui/stat-strip";
import { startOfWibDay, wibMonthKey, wibToday } from "@/lib/datetime";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { evaluateOverdue, receivableAging } from "@/lib/services/payment";
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

  // Evaluasi jatuh tempo yang idempoten (BR-8): invoice lewat due_date menjadi `overdue` di database.
  // Cron harian (/api/cron/overdue) tetap menjadi mekanisme utama; di sini sebagai pengaman saat aplikasi dipakai.
  if (seesWarehouse) await evaluateOverdue();

  // Angka penagihan dihitung dari invoice. Pembayaran masuk mengurangi piutang lewat paidAmount.
  const today = wibToday();
  // Kolom issue_date bertipe tanggal (00:00 UTC), jadi batas bulan juga 00:00 UTC.
  const monthStart = new Date(`${wibMonthKey()}-01T00:00:00Z`);
  const [revenue, openInvoices, overdueCount, awaitingDecision] = seesWarehouse
    ? await Promise.all([
        prisma.invoice.aggregate({ where: { issueDate: { gte: monthStart } }, _sum: { totalAmount: true } }),
        prisma.invoice.findMany({ where: { status: { in: ["unpaid", "partially_paid", "overdue"] } }, select: { totalAmount: true, paidAmount: true } }),
        prisma.invoice.count({ where: { status: { in: ["unpaid", "partially_paid", "overdue"] }, dueDate: { lt: today } } }),
        prisma.quotation.count({ where: { status: "sent" } }),
      ])
    : [null, [], 0, 0];
  const receivable = openInvoices.reduce((sum, i) => sum + Number(i.totalAmount) - Number(i.paidAmount), 0);
  const aging = user.role === "owner" ? await receivableAging(today) : null;
  const overdueOutstanding = aging ? aging.slice(1).reduce((sum, bucket) => sum + Number(bucket.amount), 0) : 0;

  const stats: Stat[] =
    user.role === "owner"
      ? [
          { label: "Omset bulan ini", value: formatRupiah(Number(revenue?._sum.totalAmount ?? 0)), note: "Total invoice yang terbit" },
          { label: "Piutang berjalan", value: formatRupiah(receivable), note: `${openInvoices.length} invoice belum lunas` },
          { label: "Invoice lewat jatuh tempo", value: String(overdueCount), note: `Piutang lewat tempo ${formatRupiah(overdueOutstanding)}` },
          { label: "Sparepart stok menipis", value: String(lowStockCount), note: `dari ${sparepartKinds} jenis barang` },
        ]
      : user.role === "admin"
        ? [
            { label: "Sparepart stok menipis", value: String(lowStockCount), note: "Perlu diisi ulang" },
            { label: "Jenis sparepart", value: String(sparepartKinds), note: "Terdaftar di gudang" },
            { label: "Penawaran menunggu klien", value: String(awaitingDecision), note: "Sudah dikirim, belum diputuskan" },
            { label: "Invoice lewat jatuh tempo", value: String(overdueCount), note: "Perlu ditagih" },
          ]
        : [];

  return (
    <>
      <PageHeader title={`Selamat datang, ${firstName}`} description="Ringkasan operasional servis dan sparepart hari ini." />

      <div className="space-y-6">
        {stats.length > 0 && <StatStrip stats={stats} />}

        {aging && (
          <Panel title="Umur piutang">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th scope="col" className="px-4 py-2 sm:px-5">Keterlambatan</th>
                    <th scope="col" className="px-4 py-2 text-right sm:px-5">Jumlah invoice</th>
                    <th scope="col" className="px-4 py-2 text-right sm:px-5">Sisa tagihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aging.map((bucket) => (
                    <tr key={bucket.label}>
                      <td className="px-4 py-2.5 text-slate-700 sm:px-5">{bucket.label}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900 sm:px-5">{bucket.count}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900 sm:px-5">{formatRupiah(bucket.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 text-sm font-semibold text-slate-900">
                    <td className="px-4 py-2.5 sm:px-5">Total piutang berjalan</td>
                    <td className="px-4 py-2.5 text-right sm:px-5">{aging.reduce((sum, b) => sum + b.count, 0)}</td>
                    <td className="px-4 py-2.5 text-right sm:px-5">{formatRupiah(aging.reduce((sum, b) => sum + Number(b.amount), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>
        )}

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
