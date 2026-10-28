import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataList, type Column } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormDialog } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE, pageCountFor, parsePage } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createSupplier, deleteSupplier, updateSupplier } from "./actions";
import { SupplierFields } from "./supplier-fields";

export const metadata: Metadata = { title: "Supplier" };

type Supplier = Awaited<ReturnType<typeof prisma.supplier.findMany>>[number];

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireRole("owner", "admin");

  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const where = q
    ? {
        OR: [
          { companyName: { contains: q, mode: "insensitive" as const } },
          { contactPerson: { contains: q, mode: "insensitive" as const } },
          { country: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const total = await prisma.supplier.count({ where });
  const pageCount = pageCountFor(total);
  const page = Math.min(parsePage(params.page), pageCount);
  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { companyName: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const dash = <span className="text-slate-400">—</span>;
  const columns: Column<Supplier>[] = [
    { key: "company", header: "Perusahaan", cell: (s) => <span className="font-medium text-slate-900">{s.companyName}</span>, hideOnCard: true },
    {
      key: "country",
      header: "Negara",
      cell: (s) => (s.country === "Indonesia" ? <Badge>Lokal</Badge> : <Badge tone="warning">Impor · {s.country}</Badge>),
    },
    { key: "contact", header: "Kontak person", cell: (s) => s.contactPerson ?? dash },
    { key: "phone", header: "Telepon", cell: (s) => s.phone ?? dash },
    { key: "email", header: "Email", cell: (s) => s.email ?? dash },
  ];

  return (
    <>
      <PageHeader
        title="Supplier"
        description="Pemasok sparepart, baik lokal maupun impor."
        actions={
          <FormDialog
            triggerLabel="Tambah supplier"
            triggerIcon="plus"
            triggerVariant="primary"
            title="Tambah supplier"
            submitLabel="Simpan supplier"
            action={createSupplier}
          >
            <SupplierFields />
          </FormDialog>
        }
      />

      <FilterBar basePath="/suppliers" query={q} searchPlaceholder="Cari nama, kontak, atau negara" hasActiveFilters={q !== ""} />

      <DataList
        rows={suppliers}
        columns={columns}
        rowKey={(s) => s.id}
        caption="Daftar supplier"
        cardTitle={(s) => s.companyName}
        empty={
          <EmptyState
            icon={Truck}
            title={q ? "Supplier tidak ditemukan" : "Belum ada supplier"}
            description={q ? `Tidak ada hasil untuk “${q}”. Coba kata kunci lain.` : "Tambahkan supplier pertama untuk mulai mencatat PO impor."}
          />
        }
        actions={(s) => (
          <>
            <FormDialog
              triggerLabel={`Ubah ${s.companyName}`}
              triggerIcon="pencil"
              triggerVariant="ghost"
              iconOnly
              title="Ubah supplier"
              submitLabel="Simpan perubahan"
              action={updateSupplier.bind(null, s.id)}
            >
              <SupplierFields
                defaults={{
                  companyName: s.companyName,
                  country: s.country,
                  contactPerson: s.contactPerson,
                  phone: s.phone,
                  email: s.email,
                }}
              />
            </FormDialog>
            <FormDialog
              triggerLabel={`Hapus ${s.companyName}`}
              triggerIcon="trash"
              triggerVariant="ghost"
              iconOnly
              title="Hapus supplier?"
              submitLabel="Ya, hapus"
              destructive
              action={deleteSupplier.bind(null, s.id)}
            >
              <p className="text-sm text-slate-700">
                <strong>{s.companyName}</strong> akan dihapus permanen. Supplier yang sudah punya PO tidak dapat dihapus.
              </p>
            </FormDialog>
          </>
        )}
      />

      <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} basePath="/suppliers" params={{ q }} />
    </>
  );
}
