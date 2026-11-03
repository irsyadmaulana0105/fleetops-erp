/**
 * Waktu aplikasi mengikuti WIB (Asia/Jakarta, UTC+7, tanpa DST).
 * Server di Docker berjalan dalam UTC, jadi jam yang diketik pengguna ("09:30") tidak boleh
 * ditafsirkan memakai zona waktu server — selalu lewat fungsi-fungsi di sini.
 */

export const APP_TIME_ZONE = "Asia/Jakarta";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-10-28T09:30" (isi <input type="datetime-local">, dalam WIB) → Date. Null jika tidak valid. */
export function parseWibLocal(value: string): Date | null {
  if (!LOCAL_PATTERN.test(value)) return null;
  const date = new Date(`${value}:00+07:00`);
  // Pemeriksaan bolak-balik menolak tanggal yang "melompat" seperti 31 Februari.
  return !Number.isNaN(date.getTime()) && toWibLocalInput(date) === value ? date : null;
}

/** Date → "2026-10-28T09:30" dalam WIB, untuk nilai awal <input type="datetime-local">. */
export function toWibLocalInput(date: Date): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 16);
}

/** "2026-10-28" (<input type="date">) → Date pada 00:00 UTC, bentuk yang cocok untuk kolom @db.Date. */
export function parseDateOnly(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Awal hari ini (00:00 WIB) sebagai Date. */
export function startOfWibDay(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + WIB_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - WIB_OFFSET_MS);
}

/** Tahun dan bulan (WIB) untuk awalan nomor dokumen. */
export function wibYearMonth(now: Date = new Date()): { year: string; month: string } {
  const iso = new Date(now.getTime() + WIB_OFFSET_MS).toISOString();
  return { year: iso.slice(0, 4), month: iso.slice(5, 7) };
}

/** Tanggal hari ini menurut WIB sebagai Date 00:00 UTC (bentuk kolom @db.Date). */
export function wibToday(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + WIB_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Kunci bulan berjalan menurut WIB, mis. "2026-10". */
export function wibMonthKey(now: Date = new Date()): string {
  return new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 7);
}

/** "2026-10" → batas awal dan akhir bulan (WIB) sebagai instan UTC: [start, end). */
export function parseMonthKey(value: string): { key: string; start: Date; end: Date } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return {
    key: value,
    start: new Date(Date.UTC(year, month - 1, 1) - WIB_OFFSET_MS),
    end: new Date(Date.UTC(year, month, 1) - WIB_OFFSET_MS),
  };
}
