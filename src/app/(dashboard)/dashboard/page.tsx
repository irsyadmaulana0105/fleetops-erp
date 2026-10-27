import type { Metadata } from "next";
import { PackageX, Wrench } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatStrip, type Stat } from "@/components/ui/stat-strip";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

// Angka belum dihubungkan ke database: Fase 0 hanya menyiapkan kerangka.
// Nilai null ditampilkan sebagai "—", bukan angka karangan.
const STATS: Stat[] = [
  { label: "Omset bulan ini", value: null, note: "Tersedia setelah modul invoice" },
  { label: "Piutang berjalan", value: null, note: "Tersedia setelah modul invoice" },
  { label: "Invoice lewat jatuh tempo", value: null, note: "Tersedia setelah modul invoice" },
  { label: "Sparepart stok menipis", value: null, note: "Tersedia setelah modul sparepart" },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader title={`Selamat datang, ${firstName}`} description="Ringkasan operasional servis dan sparepart hari ini." />

      <div className="space-y-6">
        <StatStrip stats={STATS} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Work order hari ini">
            <EmptyState
              icon={Wrench}
              title="Belum ada work order"
              description="Jadwal servis dan penugasan mekanik akan muncul di sini setelah modul Work Order selesai."
            />
          </Panel>
          <Panel title="Stok perlu diisi ulang">
            <EmptyState
              icon={PackageX}
              title="Belum ada data stok"
              description="Sparepart yang stoknya sudah di batas minimum akan tercantum di sini setelah modul Sparepart selesai."
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
