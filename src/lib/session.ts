import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { RoleName } from "@/lib/nav";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "@/lib/auth/token";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: RoleName;
};

/**
 * Pengguna yang sedang login, atau null.
 *
 * Token hanya membuktikan identitas; peran dan status aktif SELALU dibaca ulang dari database,
 * sehingga akun yang dinonaktifkan atau diubah perannya langsung berlaku tanpa menunggu token habis.
 * Dibungkus `cache` agar satu request hanya satu kali query.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifySession(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

/** Untuk halaman & layout: belum login → ke /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Untuk halaman yang dibatasi peran. Peran tidak sesuai → 404 (tidak membocorkan bahwa halaman ada).
 * Server action TIDAK boleh memakai ini; pakai `authorize` di `lib/action-helpers.ts`.
 */
export async function requireRole(...roles: RoleName[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) notFound();
  return user;
}

export async function createSession(user: { id: number; role: RoleName }): Promise<void> {
  const token = await signSession({ userId: user.id, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
