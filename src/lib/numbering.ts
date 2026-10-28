import { Prisma } from "@/generated/prisma/client";
import { wibYearMonth } from "@/lib/datetime";

/**
 * Nomor dokumen berformat KODE/YYYY/MM/XXX, urutan XXX di-reset setiap bulan (WIB).
 * Contoh: WO/2026/10/007, PO-SUP/2026/10/012.
 */

export function numberPrefix(code: string, now: Date = new Date()): string {
  const { year, month } = wibYearMonth(now);
  return `${code}/${year}/${month}/`;
}

/** Nomor berikutnya dari daftar nomor yang sudah ada pada awalan yang sama. */
export function nextNumber(prefix: string, existing: string[]): string {
  let max = 0;
  for (const number of existing) {
    const sequence = Number.parseInt(number.slice(prefix.length), 10);
    if (Number.isFinite(sequence) && sequence > max) max = sequence;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/**
 * Membuat dokumen bernomor otomatis. Dua permintaan bersamaan bisa menghitung nomor yang sama;
 * kolom nomor bersifat unik, jadi yang kalah (P2002) mengulang dengan nomor berikutnya.
 */
export async function createWithNumber<T>(options: {
  code: string;
  listExisting: (prefix: string) => Promise<string[]>;
  create: (number: string) => Promise<T>;
  attempts?: number;
}): Promise<T> {
  const attempts = options.attempts ?? 5;
  for (let attempt = 1; ; attempt++) {
    const prefix = numberPrefix(options.code);
    const number = nextNumber(prefix, await options.listExisting(prefix));
    try {
      return await options.create(number);
    } catch (error) {
      const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!duplicate || attempt >= attempts) throw error;
    }
  }
}
