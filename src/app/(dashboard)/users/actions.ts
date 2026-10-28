"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { authorize, parseForm, prismaErrorState, submittedValues } from "@/lib/action-helpers";
import { errorState, type ActionState } from "@/lib/action-state";
import { prisma } from "@/lib/prisma";
import { createUserSchema, updateUserSchema } from "@/lib/validation/user";

const EMAIL_TAKEN = "Email ini sudah terdaftar.";
const BCRYPT_COST = 12;

export async function createUser(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("owner");
  if (!auth.ok) return auth.state;

  const parsed = parseForm(createUserSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { password, ...data } = parsed.data;

  try {
    await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, BCRYPT_COST) } });
  } catch (error) {
    return prismaErrorState(error, { uniqueField: "email", uniqueMessage: EMAIL_TAKEN, values: submittedValues(formData) });
  }

  revalidatePath("/users");
  return { status: "success", message: `Akun ${data.name} berhasil dibuat.` };
}

export async function updateUser(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("owner");
  if (!auth.ok) return auth.state;

  const parsed = parseForm(updateUserSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { password, ...data } = parsed.data;

  // Pemilik tidak boleh menurunkan peran atau menonaktifkan akunnya sendiri — risikonya sistem tanpa pemilik.
  // (Pemilik lain tetap bisa mengubah akun ini bila memang perlu.)
  if (id === auth.user.id && (data.role !== "owner" || !data.isActive)) {
    return errorState("Anda tidak dapat menurunkan peran atau menonaktifkan akun Anda sendiri.");
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { ...data, ...(password ? { passwordHash: await bcrypt.hash(password, BCRYPT_COST) } : {}) },
    });
  } catch (error) {
    return prismaErrorState(error, { uniqueField: "email", uniqueMessage: EMAIL_TAKEN, values: submittedValues(formData) });
  }

  revalidatePath("/users");
  return { status: "success", message: `Akun ${data.name} berhasil diperbarui.` };
}
