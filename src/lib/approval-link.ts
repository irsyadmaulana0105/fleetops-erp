import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

/**
 * Tautan persetujuan penawaran untuk klien (tanpa login).
 *
 *   tautan = /approve/<id>.<nonce>.<tanda-tangan>
 *
 * - nonce  : 32 heksa acak, disimpan di `quotations.approval_token`. Mengganti nonce mematikan tautan lama.
 * - tanda tangan : HMAC-SHA256(AUTH_SECRET, id + nonce + waktu kedaluwarsa). Tanpa rahasia server, tautan
 *   tidak bisa dipalsukan atau diperpanjang. Waktu kedaluwarsa disimpan di `approval_expires_at`.
 * Karena semua bagian bisa dihitung ulang dari database, admin dapat menyalin tautan yang sama kapan saja.
 */

export const APPROVAL_LINK_DAYS = 14;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET belum diatur atau kurang dari 32 karakter.");
  return value;
}

export function newApprovalNonce(): string {
  return randomBytes(16).toString("hex");
}

export function approvalExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + APPROVAL_LINK_DAYS * 24 * 60 * 60 * 1000);
}

function sign(id: number, nonce: string, expiresAt: Date): string {
  return createHmac("sha256", secret()).update(`quotation-approval:${id}:${nonce}:${expiresAt.getTime()}`).digest("base64url");
}

export function buildApprovalToken(id: number, nonce: string, expiresAt: Date): string {
  return `${id}.${nonce}.${sign(id, nonce, expiresAt)}`;
}

const TOKEN_PATTERN = /^(\d{1,9})\.([0-9a-f]{32})\.([A-Za-z0-9_-]{43})$/;

export function parseApprovalToken(token: string): { id: number; nonce: string; signature: string } | null {
  const match = TOKEN_PATTERN.exec(token);
  return match ? { id: Number(match[1]), nonce: match[2], signature: match[3] } : null;
}

export function isValidSignature(parsed: { id: number; nonce: string; signature: string }, expiresAt: Date): boolean {
  const expected = Buffer.from(sign(parsed.id, parsed.nonce, expiresAt));
  const given = Buffer.from(parsed.signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Alamat dasar aplikasi: `APP_URL` bila diatur, selain itu diturunkan dari header permintaan. */
export async function getBaseUrl(): Promise<string> {
  const fixed = process.env.APP_URL?.trim();
  if (fixed) return fixed.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Nomor telepon Indonesia → format internasional tanpa "+" untuk wa.me (0812… → 62812…). */
export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}
