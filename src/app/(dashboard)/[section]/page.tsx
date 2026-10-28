import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ALL_NAV_ITEMS } from "@/lib/nav";

/**
 * Halaman sementara untuk menu yang modulnya belum dibangun.
 * Saat sebuah modul dibuat (mis. `app/(dashboard)/spareparts/page.tsx`), folder statis
 * itu otomatis mengalahkan route dinamis ini — tidak perlu menghapus apa pun di sini.
 */
// Modul Fase 0–2 (dashboard, sparepart, supplier, customer, pengguna, PO impor, work order) sudah punya halaman sendiri.
const PLACEHOLDERS = ALL_NAV_ITEMS.filter((item) => item.phase >= 3);

type Params = { section: string };

export function generateStaticParams(): Params[] {
  return PLACEHOLDERS.map((item) => ({ section: item.href.slice(1) }));
}

// Hanya segmen yang ada di menu yang valid; selain itu 404.
export const dynamicParams = false;

function findItem(section: string) {
  return PLACEHOLDERS.find((item) => item.href === `/${section}`);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { section } = await params;
  const item = findItem(section);
  return { title: item?.label ?? "Halaman tidak ditemukan" };
}

export default async function PlaceholderPage({ params }: { params: Promise<Params> }) {
  const { section } = await params;
  const item = findItem(section);
  if (!item) notFound();

  return (
    <>
      <PageHeader title={item.label} description={item.summary} />
      <Panel title={item.label}>
        <EmptyState
          icon={Hammer}
          title="Modul ini belum dibangun"
          description={`Halaman ${item.label} dikerjakan pada Fase ${item.phase} di roadmap.`}
        />
      </Panel>
    </>
  );
}
