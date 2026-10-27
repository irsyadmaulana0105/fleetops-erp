import type { RoleName } from "@/lib/nav";

export type SessionUser = {
  name: string;
  email: string;
  role: RoleName;
};

export const ROLE_LABEL: Record<RoleName, string> = {
  owner: "Pemilik",
  admin: "Admin",
  mechanic: "Mekanik",
};

/**
 * SEMENTARA — belum ada autentikasi di Fase 0.
 *
 * Fungsi ini mengembalikan pengguna tetap supaya layout, menu per peran, dan
 * header bisa dibangun dan diuji. Ganti isinya dengan pembacaan sesi nyata
 * (mis. Auth.js atau JWT cookie httpOnly) sebelum ada halaman yang menampilkan
 * data sungguhan. Jangan jadikan ini dasar keputusan keamanan.
 */
export async function getCurrentUser(): Promise<SessionUser> {
  return { name: "Bambang Hartono", email: "owner@fleetops.test", role: "owner" };
}
