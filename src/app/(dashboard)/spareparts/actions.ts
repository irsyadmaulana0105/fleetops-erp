"use server";

import { revalidatePath } from "next/cache";
import { authorize, parseForm, prismaErrorState, submittedValues } from "@/lib/action-helpers";
import type { ActionState } from "@/lib/action-state";
import { prisma } from "@/lib/prisma";
import { sparepartSchema } from "@/lib/validation/sparepart";

const ALLOWED = ["owner", "admin"] as const;
const SKU_TAKEN = "SKU ini sudah dipakai barang lain.";

function revalidate() {
  revalidatePath("/spareparts");
  // Dashboard menampilkan jumlah & daftar stok menipis.
  revalidatePath("/dashboard");
}

export async function createSparepart(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  const parsed = parseForm(sparepartSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    await prisma.sparepart.create({ data: parsed.data });
  } catch (error) {
    return prismaErrorState(error, { uniqueField: "sku", uniqueMessage: SKU_TAKEN, values: submittedValues(formData) });
  }

  revalidate();
  return { status: "success", message: `Sparepart ${parsed.data.sku} berhasil ditambahkan.` };
}

export async function updateSparepart(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  const parsed = parseForm(sparepartSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    await prisma.sparepart.update({ where: { id }, data: parsed.data });
  } catch (error) {
    return prismaErrorState(error, { uniqueField: "sku", uniqueMessage: SKU_TAKEN, values: submittedValues(formData) });
  }

  revalidate();
  return { status: "success", message: `Sparepart ${parsed.data.sku} berhasil diperbarui.` };
}

export async function deleteSparepart(id: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  try {
    const deleted = await prisma.sparepart.delete({ where: { id } });
    revalidate();
    return { status: "success", message: `Sparepart ${deleted.sku} dihapus.` };
  } catch (error) {
    return prismaErrorState(error);
  }
}
