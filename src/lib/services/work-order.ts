import { prisma } from "@/lib/prisma";

export type CompleteResult = { ok: true; deducted: number } | { ok: false; message: string };

class StockShortageError extends Error {
  constructor(public readonly lines: string[]) {
    super("Stok tidak cukup");
  }
}

/**
 * Menyelesaikan work order milik `mechanicId` dan mengurangi stok sparepart sesuai item penawaran
 * (tipe sparepart) yang tertaut pada WO ini. Semuanya satu transaksi: jika ada barang yang stoknya
 * kurang, status WO tidak berubah dan stok tidak berkurang sama sekali.
 *
 * Perpindahan status memakai UPDATE bersyarat (hanya dari `in_progress`), jadi pemotongan stok
 * terjadi tepat satu kali walaupun tombol diklik dua kali.
 */
export async function completeWorkOrder(workOrderId: number, mechanicId: number): Promise<CompleteResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.findFirst({
        where: { id: workOrderId, mechanicId },
        select: {
          status: true,
          customerSignature: true,
          quotationId: true,
          photos: { select: { photoType: true } },
        },
      });
      if (!workOrder) return { ok: false, message: "Work order tidak ditemukan." } as const;
      if (workOrder.status !== "in_progress") {
        return { ok: false, message: "Hanya work order yang sedang dikerjakan yang bisa diselesaikan." } as const;
      }

      const missing: string[] = [];
      if (!workOrder.photos.some((photo) => photo.photoType === "before")) missing.push("foto sebelum");
      if (!workOrder.photos.some((photo) => photo.photoType === "after")) missing.push("foto sesudah");
      if (!workOrder.customerSignature) missing.push("tanda tangan klien");
      if (missing.length > 0) return { ok: false, message: `Lengkapi dulu: ${missing.join(", ")}.` } as const;

      const moved = await tx.workOrder.updateMany({
        where: { id: workOrderId, mechanicId, status: "in_progress" },
        data: { status: "completed", completedAt: new Date() },
      });
      if (moved.count !== 1) return { ok: false, message: "Status work order sudah berubah. Muat ulang halaman." } as const;

      // Kebutuhan sparepart = total qty per barang dari item penawaran bertipe sparepart.
      const needed = new Map<number, number>();
      if (workOrder.quotationId) {
        const items = await tx.quotationItem.findMany({
          where: { quotationId: workOrder.quotationId, itemType: "sparepart", sparepartId: { not: null } },
          select: { sparepartId: true, qty: true },
        });
        for (const item of items) {
          if (item.sparepartId === null) continue;
          needed.set(item.sparepartId, (needed.get(item.sparepartId) ?? 0) + item.qty);
        }
      }

      const shortages: string[] = [];
      for (const [sparepartId, qty] of needed) {
        const updated = await tx.sparepart.updateMany({
          where: { id: sparepartId, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (updated.count !== 1) {
          const part = await tx.sparepart.findUnique({ where: { id: sparepartId }, select: { sku: true, name: true, stock: true } });
          shortages.push(part ? `${part.name} (${part.sku}): butuh ${qty}, stok ${part.stock}` : `Barang #${sparepartId} tidak ditemukan`);
        }
      }
      if (shortages.length > 0) throw new StockShortageError(shortages);

      return { ok: true, deducted: needed.size } as const;
    });
  } catch (error) {
    if (error instanceof StockShortageError) {
      return { ok: false, message: `Stok gudang belum cukup, hubungi admin. ${error.lines.join("; ")}.` };
    }
    throw error;
  }
}
