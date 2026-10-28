import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { errorState, type ActionState } from "@/lib/action-state";
import type { RoleName } from "@/lib/nav";
import { getCurrentUser, type SessionUser } from "@/lib/session";

/**
 * Pembantu untuk server action. Server action adalah endpoint HTTP publik: SETIAP action wajib
 * memanggil `authorize` sendiri — menyembunyikan tombol atau halaman di UI bukan kontrol akses.
 */

export async function authorize(
  ...roles: RoleName[]
): Promise<{ ok: true; user: SessionUser } | { ok: false; state: ActionState }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, state: errorState("Sesi Anda sudah berakhir. Silakan masuk kembali.") };
  if (!roles.includes(user.role)) return { ok: false, state: errorState("Anda tidak memiliki akses untuk tindakan ini.") };
  return { ok: true, user };
}

/** Kolom yang tidak boleh dikembalikan ke browser saat validasi gagal. */
const SENSITIVE_FIELDS = new Set(["password", "confirmPassword"]);

export function submittedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    // Kunci "$ACTION_*" ditambahkan React untuk server action; berkas tidak dipakai di form ini.
    if (key.startsWith("$ACTION_") || typeof value !== "string" || SENSITIVE_FIELDS.has(key)) continue;
    values[key] = value;
  }
  return values;
}

export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.output<S> } | { ok: false; state: ActionState } {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (result.success) return { ok: true, data: result.data };

  return {
    ok: false,
    state: {
      status: "error",
      message: "Periksa kembali isian yang ditandai merah.",
      fieldErrors: z.flattenError(result.error as z.ZodError).fieldErrors as Record<string, string[]>,
      values: submittedValues(formData),
    },
  };
}

/**
 * Menerjemahkan galat Prisma yang umum menjadi pesan yang bisa ditindaklanjuti pengguna.
 *  - P2002 (unik dilanggar)   → pesan di kolom `uniqueField`
 *  - P2003 (relasi masih ada) → data masih dipakai, tidak bisa dihapus
 *  - P2025 (tidak ditemukan)  → data sudah dihapus pihak lain
 * Galat lain dicatat di log server dan hanya dijawab secara umum.
 */
export function prismaErrorState(
  error: unknown,
  options: { uniqueField?: string; uniqueMessage?: string; values?: Record<string, string> } = {},
): ActionState {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const message = options.uniqueMessage ?? "Data dengan nilai ini sudah ada.";
      return options.uniqueField
        ? { status: "error", message, fieldErrors: { [options.uniqueField]: [message] }, values: options.values }
        : errorState(message);
    }
    if (error.code === "P2003") {
      return errorState("Data ini masih dipakai oleh data lain (misalnya penawaran atau work order), sehingga tidak dapat dihapus.");
    }
    if (error.code === "P2025") {
      return errorState("Data tidak ditemukan. Kemungkinan sudah dihapus; muat ulang halaman.");
    }
  }
  console.error("Server action gagal:", error);
  return errorState("Terjadi kesalahan pada server. Coba lagi, dan hubungi admin jika berulang.");
}
