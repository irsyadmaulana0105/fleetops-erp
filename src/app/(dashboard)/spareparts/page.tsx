import type { Metadata } from "next";
import Link from "next/link";
import { Package, TriangleAlert } from "lucide-react";
import { SparepartCategory, type Prisma } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { DataList, type Column } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormDialog } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { inputClass } from "@/components/ui/styles";
import { formatRupiah } from "@/lib/format";
import { PAGE_SIZE, pageCountFor, parsePage } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { CATEGORY_LABEL, CATEGORY_OPTIONS } from "@/lib/validation/sparepart";
import { createSparepart, deleteSparepart, updateSparepart } from "./actions";
import { SparepartFields } from "./sparepart-fields";

export const metadata: Metadata = { title: "Sparepart" };

type Sparepart = Awaited<ReturnType<typeof prisma.sparepart.findMany>>[number];

/** Stok menipis = stok ≤ stok minimum. Membandingkan dua kolom memakai field reference Prisma. */
const lowStockFilter = (): Prisma.SparepartWhereInput => ({ stock: { lte: prisma.sparepart.fields.minStock } });

export default async function SparepartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; low?: string; page?: string }>;
}) {
  await requireRole("owner", "admin");

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const category = Object.values(SparepartCategory).find((value) => value === params.category);
  const onlyLow = params.low === "1";

  const where: Prisma.SparepartWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { sku: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      category ? { category } : {},
      onlyLow ? lowStockFilter() : {},
    ],
  };

  const [total, lowStockCount] = await Promise.all([
    prisma.sparepart.count({ where }),
    prisma.sparepart.count({ where: lowStockFilter() }),
  ]);
  const pageCount = pageCountFor(total);
  const page = Math.min(parsePage(params.page), pageCount);
  const spareparts = await prisma.sparepart.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const columns: Column<Sparepart>[] = [
    { key: "sku", header: "SKU", cell: (s) => <span className="whitespace-nowrap font-mono text-xs text-slate-700">{s.sku}</span>, hideOnCard: true },
    { key: "name", header: "Nama barang", cell: (s) => <span className="font-medium text-slate-900">{s.name}</span>, hideOnCard: true },
    { key: "category", header: "Kategori", cell: (s) => <Badge>{CATEGORY_LABEL[s.category]}</Badge> },
    {
      key: "stock",
      header: "Stok",
      align: "right",
      cell: (s) => (
        <span className="inline-flex items-center justify-end gap-2">
          {s.stock <= s.minStock && <Badge tone="danger">{s.stock === 0 ? "Habis" : "Menipis"}</Badge>}
          <span className="font-medium">
            {s.stock.toLocaleString("id-ID")} <span className="font-normal text-slate-500">{s.unit}</span>
          </span>
        </span>
      ),
    },
    { key: "min", header: "Stok min.", align: "right", cell: (s) => s.minStock.toLocaleString("id-ID") },
    { key: "buy", header: "Harga modal", align: "right", cell: (s) => formatRupiah(s.buyPrice) },
    { key: "sell", header: "Harga jual", align: "right", cell: (s) => formatRupiah(s.sellPrice) },
  ];

  return (
    <>
      <PageHeader
        title="Sparepart"
        description="Stok gudang, harga modal, dan harga jual."
        actions={
          <FormDialog
            triggerLabel="Tambah sparepart"
            triggerIcon="plus"
            triggerVariant="primary"
            title="Tambah sparepart"
            submitLabel="Simpan sparepart"
            action={createSparepart}
          >
            <SparepartFields />
          </FormDialog>
        }
      />

      {lowStockCount > 0 && !onlyLow && (
        <Link
          href="/spareparts?low=1"
          className="mb-4 flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200 hover:bg-red-100"
        >
          <TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-red-600" />
          <span>
            <strong>{lowStockCount} sparepart</strong> stoknya sudah di batas minimum atau kurang. Lihat daftarnya.
          </span>
        </Link>
      )}

      <FilterBar
        basePath="/spareparts"
        query={q}
        searchPlaceholder="Cari SKU atau nama barang"
        hasActiveFilters={q !== "" || Boolean(category) || onlyLow}
      >
        <select name="category" aria-label="Kategori" defaultValue={category ?? ""} className={`${inputClass} w-auto! sm:min-w-44`}>
          <option value="">Semua kategori</option>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="low" value="1" defaultChecked={onlyLow} className="size-4 accent-amber-500" />
          Stok menipis saja
        </label>
      </FilterBar>

      <DataList
        rows={spareparts}
        columns={columns}
        rowKey={(s) => s.id}
        caption="Daftar sparepart"
        tableFrom="xl"
        cardTitle={(s) => s.name}
        cardSubtitle={(s) => <span className="font-mono text-xs">{s.sku}</span>}
        empty={
          <EmptyState
            icon={Package}
            title={q || category || onlyLow ? "Sparepart tidak ditemukan" : "Belum ada sparepart"}
            description={
              q || category || onlyLow
                ? "Tidak ada barang yang cocok dengan pencarian atau filter ini."
                : "Tambahkan sparepart pertama untuk mulai mengelola stok gudang."
            }
          />
        }
        actions={(s) => (
          <>
            <FormDialog
              triggerLabel={`Ubah ${s.sku}`}
              triggerIcon="pencil"
              triggerVariant="ghost"
              iconOnly
              title="Ubah sparepart"
              submitLabel="Simpan perubahan"
              action={updateSparepart.bind(null, s.id)}
            >
              <SparepartFields
                defaults={{
                  sku: s.sku,
                  name: s.name,
                  category: s.category,
                  stock: s.stock,
                  minStock: s.minStock,
                  // Decimal tidak bisa dikirim ke komponen client; harga rupiah disimpan utuh sehingga aman diubah ke angka.
                  buyPrice: Number(s.buyPrice),
                  sellPrice: Number(s.sellPrice),
                  unit: s.unit,
                }}
              />
            </FormDialog>
            <FormDialog
              triggerLabel={`Hapus ${s.sku}`}
              triggerIcon="trash"
              triggerVariant="ghost"
              iconOnly
              title="Hapus sparepart?"
              submitLabel="Ya, hapus"
              destructive
              action={deleteSparepart.bind(null, s.id)}
            >
              <p className="text-sm text-slate-700">
                <strong>{s.name}</strong> ({s.sku}) akan dihapus permanen. Barang yang sudah dipakai pada PO impor tidak dapat
                dihapus; item penawaran akan kehilangan tautan ke barang ini.
              </p>
            </FormDialog>
          </>
        )}
      />

      <Pagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/spareparts"
        params={{ q, category, low: onlyLow ? "1" : undefined }}
      />
    </>
  );
}
