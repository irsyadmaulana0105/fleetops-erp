"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorize, parseForm, prismaErrorState, submittedValues } from "@/lib/action-helpers";
import { errorState, type ActionState } from "@/lib/action-state";
import { createWithNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { completeWorkOrder as completeWorkOrderService } from "@/lib/services/work-order";
import {
  deleteStoredFile,
  MAX_IMAGE_BYTES,
  randomFileName,
  saveFile,
  signaturePath,
  sniffImage,
  workOrderDir,
} from "@/lib/storage";
import { expenseSchema, isPhotoType, startWorkOrderSchema, workOrderSchema } from "@/lib/validation/work-order";

const OFFICE = ["owner", "admin"] as const;

function revalidateWorkOrder(id: number) {
  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/dashboard");
}

/** Pastikan customer dan mekanik benar-benar ada, dan mekanik itu berperan mekanik serta aktif. */
async function checkAssignees(customerId: number, mechanicId: number, formData: FormData): Promise<ActionState | null> {
  const values = submittedValues(formData);
  const [customer, mechanic] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } }),
    prisma.user.findFirst({ where: { id: mechanicId, role: "mechanic", isActive: true }, select: { id: true } }),
  ]);
  if (!customer) return { status: "error", message: "Customer tidak ditemukan.", fieldErrors: { customerId: ["Pilih customer yang masih terdaftar"] }, values };
  if (!mechanic) return { status: "error", message: "Mekanik tidak valid.", fieldErrors: { mechanicId: ["Pilih mekanik yang aktif"] }, values };
  return null;
}

/* ─────────────────────────── Admin / pemilik ─────────────────────────── */

export async function createWorkOrder(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;

  const parsed = parseForm(workOrderSchema, formData);
  if (!parsed.ok) return parsed.state;
  const invalid = await checkAssignees(parsed.data.customerId, parsed.data.mechanicId, formData);
  if (invalid) return invalid;

  let id: number;
  try {
    const created = await createWithNumber({
      code: "WO",
      listExisting: async (prefix) =>
        (await prisma.workOrder.findMany({ where: { woNumber: { startsWith: prefix } }, select: { woNumber: true } })).map((wo) => wo.woNumber),
      create: (woNumber) => prisma.workOrder.create({ data: { ...parsed.data, woNumber }, select: { id: true } }),
    });
    id = created.id;
  } catch (error) {
    return prismaErrorState(error, { values: submittedValues(formData) });
  }

  revalidateWorkOrder(id);
  redirect(`/work-orders/${id}`);
}

export async function updateWorkOrder(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;

  const parsed = parseForm(workOrderSchema, formData);
  if (!parsed.ok) return parsed.state;
  const invalid = await checkAssignees(parsed.data.customerId, parsed.data.mechanicId, formData);
  if (invalid) return invalid;

  try {
    // Hanya WO yang belum dikerjakan yang boleh diubah datanya.
    const updated = await prisma.workOrder.updateMany({ where: { id, status: "scheduled" }, data: parsed.data });
    if (updated.count !== 1) return errorState("Hanya work order berstatus Terjadwal yang bisa diubah.");
  } catch (error) {
    return prismaErrorState(error, { values: submittedValues(formData) });
  }

  revalidateWorkOrder(id);
  return { status: "success", message: "Work order diperbarui." };
}

export async function cancelWorkOrder(id: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;

  try {
    const updated = await prisma.workOrder.updateMany({
      where: { id, status: { in: ["scheduled", "in_progress"] } },
      data: { status: "cancelled" },
    });
    if (updated.count !== 1) return errorState("Work order yang sudah selesai atau dibatalkan tidak bisa dibatalkan lagi.");
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidateWorkOrder(id);
  return { status: "success", message: "Work order dibatalkan." };
}

export async function reviewExpense(expenseId: number, decision: "approved" | "rejected", _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;

  try {
    const expense = await prisma.expense.findUnique({ where: { id: expenseId }, select: { workOrderId: true } });
    if (!expense) return errorState("Pengeluaran tidak ditemukan.");
    const updated = await prisma.expense.updateMany({ where: { id: expenseId, status: "pending" }, data: { status: decision } });
    if (updated.count !== 1) return errorState("Pengeluaran ini sudah diputuskan sebelumnya. Muat ulang halaman.");
    revalidateWorkOrder(expense.workOrderId);
  } catch (error) {
    return prismaErrorState(error);
  }
  return { status: "success", message: decision === "approved" ? "Pengeluaran disetujui." : "Pengeluaran ditolak." };
}

/* ─────────────────────────── Mekanik (hanya WO miliknya) ─────────────────────────── */

type MechanicContext = { ok: true; userId: number } | { ok: false; state: ActionState };

/** Hanya mekanik yang ditugaskan pada WO tersebut. Pemilik/admin memantau, tidak mengisi laporan lapangan. */
async function authorizeMechanic(workOrderId: number): Promise<MechanicContext> {
  const auth = await authorize("mechanic");
  if (!auth.ok) return auth;
  const own = await prisma.workOrder.findFirst({ where: { id: workOrderId, mechanicId: auth.user.id }, select: { id: true } });
  if (!own) return { ok: false, state: errorState("Work order tidak ditemukan.") };
  return { ok: true, userId: auth.user.id };
}

export async function startWorkOrder(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await authorizeMechanic(id);
  if (!ctx.ok) return ctx.state;

  const parsed = parseForm(startWorkOrderSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const updated = await prisma.workOrder.updateMany({
      where: { id, mechanicId: ctx.userId, status: "scheduled" },
      data: { status: "in_progress", hourMeter: parsed.data.hourMeter },
    });
    if (updated.count !== 1) return errorState("Pekerjaan ini sudah dimulai atau dibatalkan. Muat ulang halaman.");
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidateWorkOrder(id);
  return { status: "success", message: "Pekerjaan dimulai. Jangan lupa foto kondisi awal unit." };
}

/** Membaca unggahan gambar dari FormData: ukuran dibatasi dan jenis dikenali dari isi berkas. */
async function readImageUpload(value: FormDataEntryValue | null): Promise<{ data: Buffer; ext: string } | { error: string }> {
  if (!(value instanceof File) || value.size === 0) return { error: "Pilih foto terlebih dahulu." };
  if (value.size > MAX_IMAGE_BYTES) return { error: "Foto terlalu besar (maksimal 6 MB)." };
  const data = Buffer.from(await value.arrayBuffer());
  const kind = sniffImage(data);
  if (!kind) return { error: "Format foto tidak didukung. Gunakan JPG, PNG, atau WebP." };
  return { data, ext: kind.ext };
}

export async function uploadPhoto(workOrderId: number, photoType: string, formData: FormData): Promise<ActionState> {
  const ctx = await authorizeMechanic(workOrderId);
  if (!ctx.ok) return ctx.state;
  if (!isPhotoType(photoType)) return errorState("Jenis foto tidak valid.");

  const image = await readImageUpload(formData.get("photo"));
  if ("error" in image) return errorState(image.error);

  const workOrder = await prisma.workOrder.findFirst({ where: { id: workOrderId, mechanicId: ctx.userId }, select: { status: true } });
  if (workOrder?.status !== "in_progress") return errorState("Foto hanya bisa ditambahkan saat pekerjaan sedang dikerjakan.");

  const filePath = `${workOrderDir(workOrderId)}/photos/${randomFileName(image.ext)}`;
  try {
    await saveFile(filePath, image.data);
    await prisma.workOrderPhoto.create({ data: { workOrderId, photoType, filePath } });
  } catch (error) {
    await deleteStoredFile(filePath);
    return prismaErrorState(error);
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  return { status: "success", message: "Foto tersimpan." };
}

export async function deletePhoto(workOrderId: number, photoId: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const ctx = await authorizeMechanic(workOrderId);
  if (!ctx.ok) return ctx.state;

  try {
    const photo = await prisma.workOrderPhoto.findFirst({
      where: { id: photoId, workOrderId, workOrder: { mechanicId: ctx.userId, status: "in_progress" } },
      select: { id: true, filePath: true },
    });
    if (!photo) return errorState("Foto tidak ditemukan, atau pekerjaan sudah selesai.");
    await prisma.workOrderPhoto.delete({ where: { id: photo.id } });
    await deleteStoredFile(photo.filePath);
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  return { status: "success", message: "Foto dihapus." };
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_SIGNATURE_BYTES = 400 * 1024;

export async function saveSignature(workOrderId: number, dataUrl: string): Promise<ActionState> {
  const ctx = await authorizeMechanic(workOrderId);
  if (!ctx.ok) return ctx.state;

  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return errorState("Tanda tangan tidak valid. Coba tanda tangan lagi.");
  const data = Buffer.from(match[1], "base64");
  if (data.length > MAX_SIGNATURE_BYTES) return errorState("Gambar tanda tangan terlalu besar.");
  if (data.length < 8 || !data.subarray(0, 8).equals(PNG_SIGNATURE)) return errorState("Tanda tangan tidak valid. Coba tanda tangan lagi.");

  const filePath = signaturePath(workOrderId);
  try {
    const updated = await prisma.workOrder.updateMany({
      where: { id: workOrderId, mechanicId: ctx.userId, status: "in_progress" },
      data: { customerSignature: filePath },
    });
    if (updated.count !== 1) return errorState("Tanda tangan hanya bisa disimpan saat pekerjaan sedang dikerjakan.");
    await saveFile(filePath, data);
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  return { status: "success", message: "Tanda tangan klien tersimpan." };
}

export async function addExpense(workOrderId: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await authorizeMechanic(workOrderId);
  if (!ctx.ok) return ctx.state;

  const parsed = parseForm(expenseSchema, formData);
  if (!parsed.ok) return parsed.state;

  let receiptPath: string | null = null;
  const receipt = formData.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    const image = await readImageUpload(receipt);
    if ("error" in image) return { status: "error", message: image.error, fieldErrors: { receipt: [image.error] }, values: submittedValues(formData) };
    receiptPath = `${workOrderDir(workOrderId)}/receipts/${randomFileName(image.ext)}`;
    await saveFile(receiptPath, image.data);
  }

  try {
    const workOrder = await prisma.workOrder.findFirst({ where: { id: workOrderId, mechanicId: ctx.userId }, select: { status: true } });
    if (workOrder?.status !== "in_progress" && workOrder?.status !== "completed") {
      if (receiptPath) await deleteStoredFile(receiptPath);
      return errorState("Uang jalan dicatat setelah pekerjaan dimulai.");
    }
    await prisma.expense.create({
      data: { workOrderId, mechanicId: ctx.userId, description: parsed.data.description, amount: parsed.data.amount, receiptPhotoPath: receiptPath },
    });
  } catch (error) {
    if (receiptPath) await deleteStoredFile(receiptPath);
    return prismaErrorState(error, { values: submittedValues(formData) });
  }

  revalidateWorkOrder(workOrderId);
  return { status: "success", message: "Pengeluaran dicatat dan menunggu persetujuan." };
}

export async function deleteExpense(workOrderId: number, expenseId: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const ctx = await authorizeMechanic(workOrderId);
  if (!ctx.ok) return ctx.state;

  try {
    // Hanya milik sendiri dan selama belum diputuskan.
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, workOrderId, mechanicId: ctx.userId, status: "pending" },
      select: { id: true, receiptPhotoPath: true },
    });
    if (!expense) return errorState("Pengeluaran tidak ditemukan, atau sudah diputuskan oleh admin.");
    const deleted = await prisma.expense.deleteMany({ where: { id: expense.id, status: "pending" } });
    if (deleted.count !== 1) return errorState("Pengeluaran sudah diputuskan oleh admin.");
    if (expense.receiptPhotoPath) await deleteStoredFile(expense.receiptPhotoPath);
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidateWorkOrder(workOrderId);
  return { status: "success", message: "Pengeluaran dihapus." };
}

export async function completeWorkOrder(id: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const ctx = await authorizeMechanic(id);
  if (!ctx.ok) return ctx.state;

  let result;
  try {
    result = await completeWorkOrderService(id, ctx.userId);
  } catch (error) {
    return prismaErrorState(error);
  }
  if (!result.ok) return errorState(result.message);

  revalidateWorkOrder(id);
  revalidatePath("/spareparts");
  return { status: "success", message: "Pekerjaan selesai. Terima kasih!" };
}
