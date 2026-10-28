"use server";

import { revalidatePath } from "next/cache";
import { authorize, parseForm, prismaErrorState } from "@/lib/action-helpers";
import type { ActionState } from "@/lib/action-state";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validation/customer";

const ALLOWED = ["owner", "admin"] as const;

export async function createCustomer(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  const parsed = parseForm(customerSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    await prisma.customer.create({ data: parsed.data });
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidatePath("/customers");
  return { status: "success", message: `Customer ${parsed.data.companyName} berhasil ditambahkan.` };
}

export async function updateCustomer(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  const parsed = parseForm(customerSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    await prisma.customer.update({ where: { id }, data: parsed.data });
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidatePath("/customers");
  return { status: "success", message: `Data ${parsed.data.companyName} berhasil diperbarui.` };
}

export async function deleteCustomer(id: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize(...ALLOWED);
  if (!auth.ok) return auth.state;

  try {
    const deleted = await prisma.customer.delete({ where: { id } });
    revalidatePath("/customers");
    return { status: "success", message: `Customer ${deleted.companyName} dihapus.` };
  } catch (error) {
    return prismaErrorState(error);
  }
}
