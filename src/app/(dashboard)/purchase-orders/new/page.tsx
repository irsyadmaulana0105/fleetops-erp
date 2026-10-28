import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageForm } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createPurchaseOrder } from "../actions";
import { PoHeaderFields } from "../po-header-fields";
import { PoItemsEditor } from "../po-items-editor";

export const metadata: Metadata = { title: "Buat PO" };

export default async function NewPurchaseOrderPage() {
  await requireRole("owner", "admin");

  const [suppliers, spareparts] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { companyName: "asc" }, select: { id: true, companyName: true, country: true } }),
    prisma.sparepart.findMany({ orderBy: { name: "asc" }, select: { id: true, sku: true, name: true, unit: true, buyPrice: true } }),
  ]);

  return (
    <>
      <Link href="/purchase-orders" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Daftar PO
      </Link>
      <PageHeader title="Buat PO" description="PO disimpan sebagai draft. Tandai sebagai dipesan setelah dikirim ke supplier." />

      {suppliers.length === 0 || spareparts.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          {suppliers.length === 0 ? (
            <>
              Belum ada supplier. <Link href="/suppliers" className="font-medium underline">Tambahkan supplier</Link> dulu.
            </>
          ) : (
            <>
              Belum ada sparepart. <Link href="/spareparts" className="font-medium underline">Tambahkan sparepart</Link> dulu.
            </>
          )}
        </p>
      ) : (
        <PageForm action={createPurchaseOrder} submitLabel="Simpan draft PO" cancelHref="/purchase-orders">
          <PoHeaderFields suppliers={suppliers} />
          <PoItemsEditor spareparts={spareparts.map((part) => ({ ...part, buyPrice: Number(part.buyPrice) }))} />
        </PageForm>
      )}
    </>
  );
}
