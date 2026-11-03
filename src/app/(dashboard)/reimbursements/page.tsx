import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { buttonClass, inputClass } from "@/components/ui/styles";
import { parseMonthKey, wibMonthKey } from "@/lib/datetime";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { markReimbursed } from "./actions";

export const metadata: Metadata = { title: "Rekap Uang Jalan" };

export default async function ReimbursementsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireRole("owner", "admin");

  const requested = (await searchParams).month ?? "";
  const month = parseMonthKey(requested) ?? parseMonthKey(wibMonthKey())!;

  const expenses = await prisma.expense.findMany({
    where: { createdAt: { gte: month.start, lt: month.end }, status: { in: ["approved", "pending"] } },
    include: { mechanic: { select: { id: true, name: true } }, workOrder: { select: { id: true, woNumber: true } } },
    orderBy: { createdAt: "asc" },
  });

  type Group = { id: number; name: string; approved: number; paid: number; pending: number; unpaidItems: typeof expenses };
  const groups = new Map<number, Group>();
  for (const expense of expenses) {
    const group = groups.get(expense.mechanic.id) ?? { id: expense.mechanic.id, name: expense.mechanic.name, approved: 0, paid: 0, pending: 0, unpaidItems: [] };
    const amount = Number(expense.amount);
    if (expense.status === "pending") group.pending += 1;
    else {
      group.approved += amount;
      if (expense.reimbursedAt) group.paid += amount;
      else group.unpaidItems.push(expense);
    }
    groups.set(expense.mechanic.id, group);
  }
  const rows = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
  const totalUnpaid = rows.reduce((sum, g) => sum + (g.approved - g.paid), 0);

  return (
    <>
      <PageHeader title="Rekap uang jalan" description="Uang jalan mekanik yang disetujui, dikelompokkan per mekanik. Ini biaya internal dan tidak masuk invoice klien." />

      <form method="get" action="/reimbursements" className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="month" className="mb-1.5 block text-sm font-medium text-slate-700">Bulan</label>
          <input id="month" name="month" type="month" defaultValue={month.key} className={`${inputClass} w-auto!`} />
        </div>
        <button type="submit" className={buttonClass("secondary")}>Tampilkan</button>
        <p className="ml-auto text-sm text-slate-600">
          Belum dibayar bulan ini <span className="font-semibold text-slate-900">{formatRupiah(totalUnpaid)}</span>
        </p>
      </form>

      {rows.length === 0 ? (
        <Panel title="Rekap bulan ini">
          <EmptyState icon={Wallet} title="Belum ada uang jalan" description="Tidak ada pengeluaran mekanik pada bulan ini." />
        </Panel>
      ) : (
        <div className="space-y-6">
          {rows.map((group) => {
            const unpaid = group.approved - group.paid;
            return (
              <Panel key={group.id} title={group.name}>
                <dl className="grid grid-cols-2 gap-px bg-slate-200 text-sm sm:grid-cols-4">
                  <Cell label="Disetujui" value={formatRupiah(group.approved)} />
                  <Cell label="Sudah dibayar" value={formatRupiah(group.paid)} />
                  <Cell label="Belum dibayar" value={formatRupiah(unpaid)} strong />
                  <Cell label="Menunggu persetujuan" value={String(group.pending)} />
                </dl>

                {group.unpaidItems.length > 0 && (
                  <ul className="divide-y divide-slate-100">
                    {group.unpaidItems.map((expense) => (
                      <li key={expense.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{expense.description}</p>
                          <p className="text-sm text-slate-600">
                            <Link href={`/work-orders/${expense.workOrder.id}`} className="font-mono text-xs underline decoration-amber-500 decoration-2 underline-offset-4">{expense.workOrder.woNumber}</Link>
                            {" · "}{formatDateTime(expense.createdAt)}
                          </p>
                        </div>
                        <span className="font-medium text-slate-900">{formatRupiah(expense.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
                  {unpaid > 0 ? (
                    <>
                      <p className="text-sm text-slate-600">
                        {group.pending > 0 && <Badge tone="warning">{group.pending} menunggu persetujuan, tidak ikut dibayar</Badge>}
                      </p>
                      <FormDialog
                        triggerLabel="Tandai sudah dibayar"
                        triggerVariant="primary"
                        title="Tandai sudah dibayar?"
                        submitLabel="Ya, sudah dibayar"
                        action={markReimbursed.bind(null, group.id, month.key)}
                      >
                        <p className="text-sm text-slate-700">
                          Uang jalan disetujui milik <strong>{group.name}</strong> sebesar <strong>{formatRupiah(unpaid)}</strong> pada bulan ini akan ditandai sudah diganti.
                        </p>
                      </FormDialog>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">Tidak ada yang perlu dibayar.</p>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="bg-white px-4 py-3 sm:px-5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 ${strong ? "text-base font-semibold text-slate-900" : "font-medium text-slate-900"}`}>{value}</dd>
    </div>
  );
}
