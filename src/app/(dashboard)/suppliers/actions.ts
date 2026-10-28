"use server";

import { revalidatePath } from "next/cache";
import { authorize, parseForm, prismaErrorState } from "@/lib/action-helpers";
import type { ActionState } from "@/lib/action-state";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validation/supplier";

const ALLOWED = ["owner", "admin"] as const;

export async function createSupplier(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  const parsed = parseForm(supplierSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    await prisma.supplier.create({ data: parsed.data });
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidatePath("/suppliers");
  return { status: "success", message: `Supplier ${parsed.data.companyName} berhasil ditambahkan.` };
}

export async function updateSupplier(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  const parsed = parseForm(supplierSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    await prisma.supplier.update({ where: { id }, data: parsed.data });
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidatePath("/suppliers");
  return { status: "success", message: `Data ${parsed.data.companyName} berhasil diperbarui.` };
}

export async function deleteSupplier(id: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  try {
    const deleted = await prisma.supplier.delete({ where: { id } });
    revalidatePath("/suppliers");
    return { status: "success", message: `Supplier ${deleted.companyName} dihapus.` };
  } catch (error) {
    return prismaErrorState(error);
  }
}
