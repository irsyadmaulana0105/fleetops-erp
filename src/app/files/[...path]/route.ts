import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { MIME_BY_EXT, readStoredFile, SERVABLE_PATH } from "@/lib/storage";

/**
 * Satu-satunya jalan keluar untuk berkas unggahan (foto kerja, kuitansi, tanda tangan).
 * Berkas hanya dilayani untuk pengguna yang login: pemilik/admin boleh semua,
 * mekanik hanya berkas dari work order miliknya. Path divalidasi ketat (tanpa ../).
 */
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Silakan masuk terlebih dahulu.", { status: 401 });

  const relativePath = (await context.params).path.join("/");
  const match = SERVABLE_PATH.exec(relativePath);
  if (!match) return new Response("Tidak ditemukan.", { status: 404 });

  if (user.role === "mechanic") {
    const own = await prisma.workOrder.findFirst({ where: { id: Number(match[1]), mechanicId: user.id }, select: { id: true } });
    if (!own) return new Response("Tidak ditemukan.", { status: 404 });
  }

  const data = await readStoredFile(relativePath);
  if (!data) return new Response("Tidak ditemukan.", { status: 404 });

  const ext = relativePath.slice(relativePath.lastIndexOf(".") + 1);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Length": String(data.length),
      // Nama berkas acak dan tidak pernah dipakai ulang untuk isi lain, kecuali tanda tangan (boleh ditimpa).
      "Cache-Control": "private, max-age=300",
    },
  });
}
