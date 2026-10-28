"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { errorState, type ActionState } from "@/lib/action-state";
import { parseForm } from "@/lib/action-helpers";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email wajib diisi"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
  next: z.string().optional(),
});

/**
 * Hash palsu untuk membandingkan kata sandi saat email tidak terdaftar, sehingga waktu respons
 * tidak membocorkan apakah sebuah email ada di sistem. Dihitung sekali, saat pertama dipakai.
 */
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash("kata-sandi-palsu-untuk-menyamakan-waktu", 12);
  return dummyHash;
}

/** Hanya izinkan tujuan di dalam aplikasi ("/path"); tolak "//host" dan URL absolut (open redirect). */
function safeNext(value: string | undefined): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") && !value.startsWith("/login")) {
    return value;
  }
  return "/dashboard";
}

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { email, password, next } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, passwordHash: true, isActive: true },
  });

  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));

  // Satu pesan untuk semua kegagalan: email tidak ada, kata sandi salah, atau akun nonaktif.
  if (!user || !passwordMatches || !user.isActive) {
    return errorState("Email atau kata sandi salah.");
  }

  try {
    await createSession({ id: user.id, role: user.role });
  } catch (error) {
    console.error("Gagal membuat sesi:", error);
    return errorState("Server belum dikonfigurasi dengan benar (AUTH_SECRET). Hubungi administrator.");
  }

  redirect(safeNext(next));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
