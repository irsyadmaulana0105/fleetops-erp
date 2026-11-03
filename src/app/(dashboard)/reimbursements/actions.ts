"use server";

import { revalidatePath } from "next/cache";
import { authorize, prismaErrorState } from "@/lib/action-helpers";
import { errorState, type ActionState } from "@/lib/action-state";
import { parseMonthKey } from "@/lib/datetime";
import { formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/**
 * Tandai semua uang jalan yang SUDAH DISETUJUI milik satu mekanik pada satu bulan sebagai sudah dibayar.
 * Pengeluaran yang masih menunggu atau ditolak tidak tersentuh, dan yang sudah ditandai tidak ditimpa
 * (kondisi `reimbursedAt: null` ada di dalam where, jadi aman bila dua admin menekan bersamaan).
 */
export async function markReimbursed(mechanicId: number, monthKey: string, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize("owner", "admin");
  if (!auth.ok) return auth.state;

  const month = parseMonthKey(monthKey);
  if (!month) return errorState("Bulan tidak valid.");

  try {
    const where = { mechanicId, status: "approved" as const, reimbursedAt: null, createdAt: { gte: month.start, lt: month.end } };
    const sum = await prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true });
    if (sum._count === 0) return errorState("Tidak ada uang jalan yang perlu dibayar untuk mekanik ini.");
    const updated = await prisma.expense.updateMany({ where, data: { reimbursedAt: new Date() } });
    revalidatePath("/reimbursements");
    revalidatePath("/work-orders");
    return { status: "success", message: `${updated.count} pengeluaran (${formatRupiah(sum._sum.amount ?? 0)}) ditandai sudah dibayar.` };
  } catch (error) {
    return prismaErrorState(error);
  }
}
