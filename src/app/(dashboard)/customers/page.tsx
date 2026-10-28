import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { DataList, type Column } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormDialog } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE, pageCountFor, parsePage } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createCustomer, deleteCustomer, updateCustomer } from "./actions";
import { CustomerFields } from "./customer-fields";

export const metadata: Metadata = { title: "Customer" };

type Customer = Awaited<ReturnType<typeof prisma.customer.findMany>>[number];

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireRole("owner", "admin");

  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const where = q
    ? {
        OR: [
          { companyName: { contains: q, mode: "insensitive" as const } },
          { picName: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const total = await prisma.customer.count({ where });
  const pageCount = pageCountFor(total);
  const page = Math.min(parsePage(params.page), pageCount);
  const customers = await prisma.customer.findMany({
    where,
    orderBy: { companyName: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const columns: Column<Customer>[] = [
    {
      key: "company",
      header: "Perusahaan",
      cell: (c) => <span className="font-medium text-slate-900">{c.companyName}</span>,
      hideOnCard: true,
    },
    {
      key: "pic",
      header: "PIC",
      cell: (c) => (
        <>
          <span className="block">{c.picName}</span>
          <span className="block text-slate-500">{c.picPhone}</span>
        </>
      ),
    },
    { key: "email", header: "Email", cell: (c) => c.email ?? <span className="text-slate-400">—</span> },
    { key: "top", header: "TOP", cell: (c) => `${c.topDays} hari`, align: "right" },
    { key: "address", header: "Alamat", cell: (c) => <span className="line-clamp-2 max-w-xs">{c.address}</span>, hideOnCard: true },
  ];

  return (
    <>
      <PageHeader
        title="Customer"
        description="Pabrik dan perusahaan klien, beserta tempo pembayaran (TOP) masing-masing."
        actions={
          <FormDialog
            triggerLabel="Tambah customer"
            triggerIcon="plus"
            triggerVariant="primary"
            title="Tambah customer"
            submitLabel="Simpan customer"
            action={createCustomer}
          >
            <CustomerFields />
          </FormDialog>
        }
      />

      <FilterBar basePath="/customers" query={q} searchPlaceholder="Cari nama perusahaan atau PIC" hasActiveFilters={q !== ""} />

      <DataList
        rows={customers}
        columns={columns}
        rowKey={(c) => c.id}
        caption="Daftar customer"
        cardTitle={(c) => c.companyName}
        cardSubtitle={(c) => c.address}
        empty={
          <EmptyState
            icon={Building2}
            title={q ? "Customer tidak ditemukan" : "Belum ada customer"}
            description={q ? `Tidak ada hasil untuk “${q}”. Coba kata kunci lain.` : "Tambahkan pabrik atau perusahaan klien pertama Anda."}
          />
        }
        actions={(c) => (
          <>
            <FormDialog
              triggerLabel={`Ubah ${c.companyName}`}
              triggerIcon="pencil"
              triggerVariant="ghost"
              iconOnly
              title="Ubah customer"
              submitLabel="Simpan perubahan"
              action={updateCustomer.bind(null, c.id)}
            >
              <CustomerFields
                defaults={{
                  companyName: c.companyName,
                  picName: c.picName,
                  picPhone: c.picPhone,
                  email: c.email,
                  address: c.address,
                  topDays: c.topDays,
                }}
              />
            </FormDialog>
            <FormDialog
              triggerLabel={`Hapus ${c.companyName}`}
              triggerIcon="trash"
              triggerVariant="ghost"
              iconOnly
              title="Hapus customer?"
              submitLabel="Ya, hapus"
              destructive
              action={deleteCustomer.bind(null, c.id)}
            >
              <p className="text-sm text-slate-700">
                <strong>{c.companyName}</strong> akan dihapus permanen. Customer yang sudah punya penawaran, work order, atau
                invoice tidak dapat dihapus.
              </p>
            </FormDialog>
          </>
        )}
      />

      <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} basePath="/customers" params={{ q }} />
    </>
  );
}
