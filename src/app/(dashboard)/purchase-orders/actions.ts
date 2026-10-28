"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import type { PurchaseOrderStatus } from "@/generated/prisma/client";
import { authorize, parseForm, prismaErrorState, submittedValues } from "@/lib/action-helpers";
import { errorState, type ActionState } from "@/lib/action-state";
import { createWithNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { transitionPurchaseOrder } from "@/lib/services/purchase-order";
import {
  parsePurchaseOrderItems,
  PO_STATUS_LABEL,
  purchaseOrderHeaderSchema,
  shipmentSchema,
  type PurchaseOrderItemInput,
} from "@/lib/validation/purchase-order";

const ALLOWED = ["owner", "admin"] as const;

function lineData(items: PurchaseOrderItemInput[]) {
  return items.map((item) => ({
    sparepartId: item.sparepartId,
    qty: item.qty,
    unitPrice: item.unitPrice,
    subtotal: item.qty * item.unitPrice,
  }));
}

const totalOf = (items: PurchaseOrderItemInput[]) => items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

/** Membaca header + baris barang dari form; pesan galat baris barang ditaruh pada kolom `items`. */
function parsePurchaseOrderForm(formData: FormData) {
  const header = purchaseOrderHeaderSchema.safeParse(Object.fromEntries(formData));
  const items = parsePurchaseOrderItems(formData);
  if (header.success && items.ok) return { ok: true as const, header: header.data, items: items.items };

  const fieldErrors: Record<string, string[]> = header.success ? {} : (z.flattenError(header.error).fieldErrors as Record<string, string[]>);
  if (!items.ok) fieldErrors.items = items.errors;
  const state: ActionState = {
    status: "error",
    message: "Periksa kembali isian yang ditandai merah.",
    fieldErrors,
    values: submittedValues(formData),
  };
  return { ok: false as const, state };
}

/** Memastikan supplier dan semua barang benar-benar ada, agar galat relasi tidak muncul sebagai pesan teknis. */
async function referencesExist(supplierId: number, items: PurchaseOrderItemInput[]): Promise<ActionState | null> {
  const [supplier, parts] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true } }),
    prisma.sparepart.count({ where: { id: { in: items.map((item) => item.sparepartId) } } }),
  ]);
  if (!supplier) return { status: "error", message: "Supplier tidak ditemukan.", fieldErrors: { supplierId: ["Pilih supplier yang masih terdaftar"] } };
  if (parts !== items.length) return errorState("Ada barang yang sudah tidak terdaftar. Muat ulang halaman lalu pilih ulang barangnya.");
  return null;
}

export async function createPurchaseOrder(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  const parsed = parsePurchaseOrderForm(formData);
  if (!parsed.ok) return parsed.state;
  const missing = await referencesExist(parsed.header.supplierId, parsed.items);
  if (missing) return missing;

  let id: number;
  try {
    const created = await createWithNumber({
      code: "PO-SUP",
      listExisting: async (prefix) =>
        (await prisma.purchaseOrder.findMany({ where: { poNumber: { startsWith: prefix } }, select: { poNumber: true } })).map((po) => po.poNumber),
      create: (poNumber) =>
        prisma.purchaseOrder.create({
          data: {
            poNumber,
            supplierId: parsed.header.supplierId,
            etaDate: parsed.header.etaDate,
            trackingNumber: parsed.header.trackingNumber,
            totalAmount: totalOf(parsed.items),
            items: { create: lineData(parsed.items) },
          },
          select: { id: true },
        }),
    });
    id = created.id;
  } catch (error) {
    return prismaErrorState(error, { values: submittedValues(formData) });
  }

  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${id}`);
}

export async function updatePurchaseOrder(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  const parsed = parsePurchaseOrderForm(formData);
  if (!parsed.ok) return parsed.state;
  const missing = await referencesExist(parsed.header.supplierId, parsed.items);
  if (missing) return missing;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Isi PO hanya boleh diubah selama masih draft; syarat ini ikut dalam UPDATE agar tidak balapan dengan perubahan status.
      const updated = await tx.purchaseOrder.updateMany({
        where: { id, status: "draft" },
        data: {
          supplierId: parsed.header.supplierId,
          etaDate: parsed.header.etaDate,
          trackingNumber: parsed.header.trackingNumber,
          totalAmount: totalOf(parsed.items),
        },
      });
      if (updated.count !== 1) return false;
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      await tx.purchaseOrderItem.createMany({ data: lineData(parsed.items).map((line) => ({ ...line, purchaseOrderId: id })) });
      return true;
    });
    if (!result) return errorState("Hanya PO berstatus Draft yang isinya bisa diubah.");
  } catch (error) {
    return prismaErrorState(error, { values: submittedValues(formData) });
  }

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
  redirect(`/purchase-orders/${id}`);
}

export async function updateShipment(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  const parsed = parseForm(shipmentSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const updated = await prisma.purchaseOrder.updateMany({
      where: { id, status: { in: ["draft", "ordered", "customs_cleared"] } },
      data: { etaDate: parsed.data.etaDate, trackingNumber: parsed.data.trackingNumber },
    });
    if (updated.count !== 1) return errorState("Info pengiriman hanya bisa diubah pada PO yang belum diterima atau dibatalkan.");
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
  return { status: "success", message: "Info pengiriman diperbarui." };
}

export async function changePurchaseOrderStatus(
  id: number,
  to: PurchaseOrderStatus,
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  let result;
  try {
    result = await transitionPurchaseOrder(id, to);
  } catch (error) {
    return prismaErrorState(error);
  }
  if (!result.ok) return errorState(result.message);

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
  if (to === "received") {
    // Stok bertambah: daftar sparepart dan peringatan stok menipis di dashboard ikut berubah.
    revalidatePath("/spareparts");
    revalidatePath("/dashboard");
  }
  return {
    status: "success",
    message: to === "received" ? "PO diterima dan stok gudang bertambah." : `Status PO diubah menjadi ${PO_STATUS_LABEL[to]}.`,
  };
}

export async function deletePurchaseOrder(id: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  try {
    const deleted = await prisma.purchaseOrder.deleteMany({ where: { id, status: "draft" } });
    if (deleted.count !== 1) return errorState("Hanya PO berstatus Draft yang bisa dihapus. PO lain cukup dibatalkan.");
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidatePath("/purchase-orders");
  redirect("/purchase-orders");
}
