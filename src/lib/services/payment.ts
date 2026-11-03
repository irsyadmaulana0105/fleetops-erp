import { Prisma } from "@/generated/prisma/client";
import { wibToday } from "@/lib/datetime";
import { formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { notifyOwners } from "./notification";
import type { ServiceResult } from "./quotation";

export type RecordPaymentInput = {
  invoiceId: number;
  paymentMethod: string;
  /** Referensi transaksi / ID webhook. Null untuk pencatatan manual tanpa referensi. Unik bila diisi. */
  transactionRef: string | null;
  amount: Prisma.Decimal;
  paidAt: Date;
  notes: string | null;
};

export type RecordPaymentResult = ServiceResult<{ invoiceId: number; status: string; duplicate: boolean }>;

/**
 * Mencatat pembayaran masuk untuk sebuah invoice. Dipakai oleh form pencatatan manual (admin/pemilik)
 * dan oleh webhook payment gateway.
 *
 * Invarian (docs/data-model.md BR-7, BR-9):
 *  - `transaction_ref` yang sudah pernah dicatat ditolak; webhook yang terkirim dua kali tidak menghitung dua kali.
 *  - Invoice menjadi `paid` bila `paid_amount >= total_amount`, `partially_paid` bila ada pembayaran sebagian.
 *  - Perubahan `paid_amount` memakai syarat `paid_amount = nilai lama` di dalam satu transaksi, sehingga
 *    dua pembayaran berjalan bersamaan tidak saling menimpa (yang kalah dijawab "muat ulang halaman").
 *  - Pembayaran melebihi sisa tagihan ditolak.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<RecordPaymentResult> {
  if (!input.amount.isFinite() || input.amount.lte(0)) {
    return { ok: false, message: "Jumlah pembayaran harus lebih besar dari nol." };
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: input.invoiceId },
        select: { id: true, invoiceNumber: true, status: true, totalAmount: true, paidAmount: true },
      });
      if (!invoice) return { kind: "not_found" as const };

      if (input.transactionRef) {
        const existing = await tx.payment.findUnique({ where: { transactionRef: input.transactionRef }, select: { id: true } });
        if (existing) return { kind: "duplicate" as const };
      }

      const outstanding = invoice.totalAmount.sub(invoice.paidAmount);
      if (input.amount.gt(outstanding)) {
        return { kind: "overpay" as const, outstanding };
      }

      const newPaid = invoice.paidAmount.add(input.amount);
      const newStatus = newPaid.gte(invoice.totalAmount) ? ("paid" as const) : ("partially_paid" as const);

      // Syarat `paidAmount = nilai lama` membuat dua pembayaran bersamaan tidak saling menimpa.
      const updated = await tx.invoice.updateMany({
        where: { id: invoice.id, paidAmount: invoice.paidAmount, status: { in: ["unpaid", "partially_paid", "overdue"] } },
        data: { paidAmount: newPaid, status: newStatus },
      });
      if (updated.count !== 1) return { kind: "conflict" as const };

      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          paymentMethod: input.paymentMethod,
          transactionRef: input.transactionRef,
          amount: input.amount,
          paidAt: input.paidAt,
          notes: input.notes,
        },
      });

      return { kind: "recorded" as const, invoiceNumber: invoice.invoiceNumber, invoiceId: invoice.id, status: newStatus };
    });

    if (outcome.kind === "not_found") return { ok: false, message: "Invoice tidak ditemukan." };
    if (outcome.kind === "duplicate") return { ok: true, invoiceId: input.invoiceId, status: "duplicate", duplicate: true };
    if (outcome.kind === "overpay") {
      return { ok: false, message: `Jumlah melebihi sisa tagihan (${formatRupiah(outcome.outstanding)}).` };
    }
    if (outcome.kind === "conflict") {
      return { ok: false, message: "Invoice ini baru saja menerima pembayaran lain. Muat ulang halaman." };
    }

    // Notifikasi pemilik bersifat terbaik-usaha: kegagalan notifikasi tidak membatalkan pembayaran.
    try {
      await notifyOwners({
        title: "Pembayaran masuk",
        body: `${outcome.invoiceNumber} menerima ${formatRupiah(input.amount)} via ${input.paymentMethod}.`,
        href: `/invoices/${outcome.invoiceId}`,
      });
    } catch (error) {
      console.error("Gagal membuat notifikasi pembayaran:", error);
    }

    return { ok: true, invoiceId: outcome.invoiceId, status: outcome.status, duplicate: false };
  } catch (error) {
    // Dua webhook bersamaan dengan referensi sama: yang kalah menabrak indeks unik transaction_ref.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: true, invoiceId: input.invoiceId, status: "duplicate", duplicate: true };
    }
    throw error;
  }
}

/**
 * Evaluasi harian (BR-8): invoice yang belum lunas dan sudah lewat jatuh tempo menjadi `overdue`.
 * Idempoten — invoice yang sudah `overdue` tidak disentuh lagi.
 */
export async function evaluateOverdue(today: Date = wibToday()): Promise<number> {
  const result = await prisma.invoice.updateMany({
    where: { status: { in: ["unpaid", "partially_paid"] }, dueDate: { lt: today } },
    data: { status: "overdue" },
  });
  return result.count;
}

export type AgingBucket = { label: string; count: number; amount: Prisma.Decimal };

/** Umur piutang: dikelompokkan menurut hari keterlambatan dari jatuh tempo (BR / Fase 4). */
export async function receivableAging(today: Date = wibToday()): Promise<AgingBucket[]> {
  const open = await prisma.invoice.findMany({
    where: { status: { in: ["unpaid", "partially_paid", "overdue"] } },
    select: { totalAmount: true, paidAmount: true, dueDate: true },
  });

  const buckets: AgingBucket[] = [
    { label: "Belum jatuh tempo", count: 0, amount: new Prisma.Decimal(0) },
    { label: "1–30 hari", count: 0, amount: new Prisma.Decimal(0) },
    { label: "31–90 hari", count: 0, amount: new Prisma.Decimal(0) },
    { label: "91–180 hari", count: 0, amount: new Prisma.Decimal(0) },
    { label: "> 180 hari", count: 0, amount: new Prisma.Decimal(0) },
  ];

  for (const invoice of open) {
    const outstanding = invoice.totalAmount.sub(invoice.paidAmount);
    const daysLate = Math.floor((today.getTime() - invoice.dueDate.getTime()) / 86_400_000);
    const index = daysLate <= 0 ? 0 : daysLate <= 30 ? 1 : daysLate <= 90 ? 2 : daysLate <= 180 ? 3 : 4;
    buckets[index].count += 1;
    buckets[index].amount = buckets[index].amount.add(outstanding);
  }

  return buckets;
}
