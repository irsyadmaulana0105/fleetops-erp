/**
 * Bentuk hasil server action yang dipakai bersama oleh server dan komponen form (client).
 * Berkas ini tidak boleh mengimpor modul server-only.
 */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      /** Pesan per kolom, kunci = atribut `name` input. */
      fieldErrors?: Record<string, string[]>;
      /** Isian yang dikirim, dipakai mengisi ulang form (React 19 mengosongkan form setelah action selesai). */
      values?: Record<string, string>;
    };

export const idleState: ActionState = { status: "idle" };

export function errorState(message: string, fieldErrors?: Record<string, string[]>): ActionState {
  return { status: "error", message, fieldErrors };
}
