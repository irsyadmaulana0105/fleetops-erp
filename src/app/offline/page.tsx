import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Tidak ada koneksi" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-shell px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-slate-800 text-amber-500">
        <WifiOff aria-hidden="true" className="size-7" />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-white">Tidak ada koneksi internet</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-300">
        Data terbaru tidak dapat dimuat. Periksa sinyal Anda, lalu muat ulang halaman ini.
      </p>
    </main>
  );
}
