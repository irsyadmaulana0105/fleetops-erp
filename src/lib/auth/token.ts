import { jwtVerify, SignJWT } from "jose";
import type { RoleName } from "@/lib/nav";

/**
 * Token sesi (JWT HS256) — hanya memakai `jose` sehingga aman dipakai di middleware (Edge runtime).
 * Jangan mengimpor Prisma atau modul Node-only ke berkas ini.
 */

export const SESSION_COOKIE = "fleetops_session";

/** Masa berlaku sesi. Mekanik di lapangan cukup login sekali per hari kerja. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export type SessionClaims = { userId: number; role: RoleName };

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET belum diatur atau kurang dari 32 karakter. Buat dengan: openssl rand -base64 48",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(claims.userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Mengembalikan klaim jika token sah dan belum kedaluwarsa; selain itu null. */
export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const userId = Number(payload.sub);
    const role = payload.role;
    if (!Number.isInteger(userId) || (role !== "owner" && role !== "admin" && role !== "mechanic")) return null;
    return { userId, role };
  } catch {
    return null;
  }
}
