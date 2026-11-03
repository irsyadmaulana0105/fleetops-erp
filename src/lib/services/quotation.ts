import { Prisma, type QuotationStatus } from "@/generated/prisma/client";
import { wibToday } from "@/lib/datetime";
import { approvalExpiry, buildApprovalToken, isValidSignature, newApprovalNonce, parseApprovalToken } from "@/lib/approval-link";
import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/totals";
import type { QuotationItemInput } from "@/lib/validation/quotation";

export type ServiceResult<T = object> = ({ ok: true } & T) | { ok: false; message: string };

export type QuotationDraft = {
  customerId: number;
  validUntil: Date;
  discount: number;
  applyPpn: boolean;
  notes: string | null;
  items: QuotationItemInput[];
};

/**
 * Mengubah baris isian menjadi baris tersimpan: deskripsi sparepart diambil dari data barang,
 * lalu total dihitung dengan Decimal. Mengembalikan pesan galat yang bisa langsung ditampilkan.
 */
export async function prepareQuotation(draft: QuotationDraft): Promise<
  | {
      ok: true;
      header: { customerId: number; validUntil: Date; notes: string | null; subtotal: Prisma.Decimal; discount: Prisma.Decimal; taxPpn: Prisma.Decimal; grandTotal: Prisma.Decimal };
      lines: { itemType: "sparepart" | "labor"; sparepartId: number | null; description: string; qty: number; unitPrice: number; subtotal: Prisma.Decimal }[];
    }
  | { ok: false; message: string; field?: "customerId" | "validUntil" | "items" | "discount" }
> {
  const customer = await prisma.customer.findUnique({ where: { id: draft.customerId }, select: { id: true } });
  if (!customer) return { ok: false, message: "Customer tidak ditemukan.", field: "customerId" };
  if (draft.validUntil < wibToday()) return { ok: false, message: "Masa berlaku sudah lewat. Pilih tanggal hari ini atau setelahnya.", field: "validUntil" };

  const partIds = draft.items.flatMap((item) => (item.itemType === "sparepart" ? [item.sparepartId] : []));
  const parts = await prisma.sparepart.findMany({ where: { id: { in: partIds } }, select: { id: true, sku: true, name: true } });
  const byId = new Map(parts.map((part) => [part.id, part]));
  if (parts.length !== partIds.length) {
    return { ok: false, message: "Ada barang yang sudah tidak terdaftar. Muat ulang halaman lalu pilih ulang barangnya.", field: "items" };
  }

  const totals = computeTotals(draft.items, draft.discount, draft.applyPpn);
  if (!totals.ok) return { ok: false, message: totals.message, field: "discount" };

  const lines = draft.items.map((item, index) => {
    const part = item.itemType === "sparepart" ? byId.get(item.sparepartId) : undefined;
    return {
      itemType: item.itemType,
      sparepartId: item.sparepartId,
      description: part ? `${part.name} (${part.sku})`.slice(0, 255) : item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      subtotal: totals.totals.lineSubtotals[index],
    };
  });

  return {
    ok: true,
    header: {
      customerId: draft.customerId,
      validUntil: draft.validUntil,
      notes: draft.notes,
      subtotal: totals.totals.subtotal,
      discount: totals.totals.discount,
      taxPpn: totals.totals.taxPpn,
      grandTotal: totals.totals.grandTotal,
    },
    lines,
  };
}

/** Menerbitkan tautan baru (nonce baru mematikan tautan lama) dan menandai penawaran terkirim. */
export async function sendQuotation(id: number): Promise<ServiceResult> {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    select: { status: true, validUntil: true, _count: { select: { items: true } } },
  });
  if (!quotation) return { ok: false, message: "Penawaran tidak ditemukan." };
  if (quotation.status !== "draft" && quotation.status !== "revised") return { ok: false, message: "Hanya penawaran berstatus Draft atau Perlu revisi yang bisa dikirim." };
  if (quotation._count.items === 0) return { ok: false, message: "Penawaran belum punya baris barang atau jasa." };
  if (quotation.validUntil < wibToday()) return { ok: false, message: "Masa berlaku penawaran sudah lewat. Ubah tanggalnya dulu." };

  const moved = await prisma.quotation.updateMany({
    where: { id, status: { in: ["draft", "revised"] } },
    data: { status: "sent", approvalToken: newApprovalNonce(), approvalExpiresAt: approvalExpiry(), responseNote: null },
  });
  return moved.count === 1 ? { ok: true } : { ok: false, message: "Status penawaran sudah berubah. Muat ulang halaman." };
}

/** Tautan baru untuk penawaran yang masih menunggu klien (mis. tautan lama kedaluwarsa atau bocor). */
export async function regenerateApprovalLink(id: number): Promise<ServiceResult> {
  const moved = await prisma.quotation.updateMany({
    where: { id, status: "sent" },
    data: { approvalToken: newApprovalNonce(), approvalExpiresAt: approvalExpiry() },
  });
  return moved.count === 1 ? { ok: true } : { ok: false, message: "Tautan hanya bisa dibuat ulang untuk penawaran yang menunggu klien." };
}

/** Menarik penawaran yang sudah terkirim untuk direvisi; tautan lama langsung mati. */
export async function recallQuotation(id: number): Promise<ServiceResult> {
  const moved = await prisma.quotation.updateMany({
    where: { id, status: "sent" },
    data: { status: "revised", approvalToken: null, approvalExpiresAt: null, responseNote: "Ditarik kembali oleh admin untuk direvisi." },
  });
  return moved.count === 1 ? { ok: true } : { ok: false, message: "Hanya penawaran yang menunggu klien yang bisa ditarik." };
}

/** Keputusan klien yang disampaikan di luar tautan (WhatsApp, telepon) dan dicatat admin. */
export async function decideManually(id: number, decision: "approved" | "rejected", actorName: string): Promise<ServiceResult> {
  const moved = await prisma.quotation.updateMany({
    where: { id, status: "sent" },
    data: {
      status: decision,
      approvedAt: decision === "approved" ? new Date() : null,
      responseNote: `${decision === "approved" ? "Disetujui" : "Ditolak"} klien di luar sistem; dicatat oleh ${actorName}.`,
    },
  });
  return moved.count === 1 ? { ok: true } : { ok: false, message: "Hanya penawaran yang menunggu klien yang bisa diputuskan." };
}

/* ─────────────────────────── Sisi klien (tanpa login) ─────────────────────────── */

export const publicQuotation = {
  include: {
    customer: { select: { companyName: true, picName: true } },
    items: { orderBy: { id: "asc" } },
  },
} satisfies Prisma.QuotationDefaultArgs;

export type PublicQuotation = Prisma.QuotationGetPayload<typeof publicQuotation>;

export type ApprovalLookup =
  | { state: "ok"; quotation: PublicQuotation; expiresAt: Date }
  | { state: "expired" }
  | { state: "invalid" };

/**
 * Memeriksa tautan: bentuk token, nonce yang masih aktif di database, tanda tangan HMAC, dan masa berlaku.
 * Semua kegagalan selain kedaluwarsa dijawab sama ("invalid") agar tidak membocorkan alasan.
 */
export async function lookupApproval(token: string): Promise<ApprovalLookup> {
  const parsed = parseApprovalToken(token);
  if (!parsed) return { state: "invalid" };

  const quotation = await prisma.quotation.findUnique({ where: { id: parsed.id }, ...publicQuotation });
  if (!quotation || !quotation.approvalToken || !quotation.approvalExpiresAt) return { state: "invalid" };
  if (quotation.approvalToken !== parsed.nonce) return { state: "invalid" };
  if (!isValidSignature(parsed, quotation.approvalExpiresAt)) return { state: "invalid" };
  if (quotation.approvalExpiresAt.getTime() < Date.now()) return { state: "expired" };
  return { state: "ok", quotation, expiresAt: quotation.approvalExpiresAt };
}

/** Tautan lengkap untuk penawaran terkirim; dihitung ulang dari database sehingga bisa ditampilkan kembali. */
export function approvalTokenFor(quotation: { id: number; approvalToken: string | null; approvalExpiresAt: Date | null }): string | null {
  if (!quotation.approvalToken || !quotation.approvalExpiresAt) return null;
  return buildApprovalToken(quotation.id, quotation.approvalToken, quotation.approvalExpiresAt);
}

/** Keputusan klien lewat tautan. Perpindahan status memakai UPDATE bersyarat sehingga hanya satu keputusan yang berlaku. */
export async function decideByCustomer(token: string, decision: Extract<QuotationStatus, "approved" | "revised" | "rejected">, note: string | null): Promise<ServiceResult> {
  const lookup = await lookupApproval(token);
  if (lookup.state === "expired") return { ok: false, message: "Tautan sudah kedaluwarsa. Hubungi kami untuk mendapatkan tautan baru." };
  if (lookup.state !== "ok") return { ok: false, message: "Tautan tidak valid." };
  if (decision === "revised" && !note) return { ok: false, message: "Tuliskan bagian yang perlu direvisi." };

  const quotation = lookup.quotation;
  if (quotation.validUntil < wibToday()) return { ok: false, message: "Masa berlaku penawaran ini sudah lewat. Hubungi kami untuk penawaran terbaru." };

  const moved = await prisma.quotation.updateMany({
    where: { id: quotation.id, status: "sent", approvalToken: quotation.approvalToken },
    data: {
      status: decision,
      approvedAt: decision === "approved" ? new Date() : null,
      responseNote: note,
      // Revisi mematikan tautan; keputusan lain mempertahankannya agar klien masih bisa melihat dan mengunduh PDF.
      ...(decision === "revised" ? { approvalToken: null, approvalExpiresAt: null } : {}),
    },
  });
  return moved.count === 1 ? { ok: true } : { ok: false, message: "Penawaran ini sudah diputuskan sebelumnya." };
}
