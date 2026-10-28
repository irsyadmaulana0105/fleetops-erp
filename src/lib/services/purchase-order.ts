import type { PurchaseOrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PO_STATUS_LABEL, PO_TRANSITIONS, statusesLeadingTo } from "@/lib/validation/purchase-order";

export type TransitionResult = { ok: true } | { ok: false; message: string };

/**
 * Memindahkan status PO sesuai alur yang diizinkan. Perpindahan dilakukan dengan satu UPDATE bersyarat
 * (status asal harus cocok), sehingga dua klik bersamaan tidak bisa menerima PO yang sama dua kali.
 * Saat berpindah ke `received`, stok setiap barang bertambah dalam transaksi yang sama.
 */
export async function transitionPurchaseOrder(id: number, to: PurchaseOrderStatus): Promise<TransitionResult> {
  return prisma.$transaction(async (tx) => {
    const moved = await tx.purchaseOrder.updateMany({
      where: { id, status: { in: statusesLeadingTo(to) } },
      data: { status: to },
    });

    if (moved.count !== 1) {
      const current = await tx.purchaseOrder.findUnique({ where: { id }, select: { status: true } });
      if (!current) return { ok: false, message: "PO tidak ditemukan. Mungkin sudah dihapus." } as const;
      const allowed = PO_TRANSITIONS[current.status].map((status) => PO_STATUS_LABEL[status]);
      return {
        ok: false,
        message:
          allowed.length === 0
            ? `PO sudah berstatus ${PO_STATUS_LABEL[current.status]} dan tidak bisa diubah lagi.`
            : `PO berstatus ${PO_STATUS_LABEL[current.status]}; perpindahan ke ${PO_STATUS_LABEL[to]} tidak diizinkan. Muat ulang halaman.`,
      } as const;
    }

    if (to === "received") {
      const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id }, select: { sparepartId: true, qty: true } });
      for (const item of items) {
        await tx.sparepart.update({ where: { id: item.sparepartId }, data: { stock: { increment: item.qty } } });
      }
    }
    return { ok: true } as const;
  });
}
