/**
 * Memperkecil foto di browser sebelum diunggah: foto kamera HP bisa 4–10 MB, sedangkan
 * sisi terpanjang 1600 px berkualitas 80% biasanya cukup di kisaran 200–500 KB (penting di sinyal pabrik).
 * Jika gagal (format tidak dikenal browser), berkas asli dikembalikan dan server yang memvalidasi.
 */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    if (scale === 1 && file.type === "image/jpeg" && blob.size >= file.size) return file;
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
