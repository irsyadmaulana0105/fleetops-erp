import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Penyimpanan berkas di disk lokal (foto kerja, kuitansi, tanda tangan).
 * Di Docker, STORAGE_DIR menunjuk ke volume permanen (/app/storage).
 * Berkas TIDAK ditaruh di public/: semuanya dilayani lewat /files/... yang memeriksa login dan hak akses.
 */

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export function storageRoot(): string {
  return path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), "storage"));
}

/** Path relatif → path absolut, dijamin berada di dalam folder penyimpanan. */
function resolveInside(relativePath: string): string {
  if (!relativePath || relativePath.includes("\0") || relativePath.includes("\\") || path.isAbsolute(relativePath)) {
    throw new Error("Path berkas tidak valid.");
  }
  const root = storageRoot();
  const full = path.resolve(root, relativePath);
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error("Path berkas di luar folder penyimpanan.");
  return full;
}

export async function saveFile(relativePath: string, data: Buffer): Promise<void> {
  const full = resolveInside(relativePath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
}

export async function readStoredFile(relativePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(resolveInside(relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Hapus berkas; tidak melempar galat bila berkasnya sudah tidak ada. */
export async function deleteStoredFile(relativePath: string): Promise<void> {
  try {
    await fs.unlink(resolveInside(relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Gagal menghapus berkas:", error);
  }
}

export type ImageKind = { ext: "jpg" | "png" | "webp"; mime: string };

/** Mengenali jenis gambar dari isi berkas (bukan dari nama atau tipe yang dikirim browser). */
export function sniffImage(data: Buffer): ImageKind | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: "png", mime: "image/png" };
  }
  if (data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP") {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

export const MIME_BY_EXT: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export function randomFileName(ext: string): string {
  return `${randomBytes(16).toString("hex")}.${ext}`;
}

/** Tata letak penyimpanan, dipusatkan agar rute /files dan action memakai pola yang sama. */
export const workOrderDir = (workOrderId: number) => `work-orders/${workOrderId}`;
export const signaturePath = (workOrderId: number) => `${workOrderDir(workOrderId)}/signature.png`;

/** Pola path yang boleh dilayani oleh /files/... — satu-satunya pintu keluar berkas. */
export const SERVABLE_PATH = /^work-orders\/(\d+)\/(?:(?:photos|receipts)\/[0-9a-f]{32}\.(?:jpg|png|webp)|signature\.png)$/;
