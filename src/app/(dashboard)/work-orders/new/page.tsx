import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageForm } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createWorkOrder } from "../actions";
import { WorkOrderFields } from "../work-order-fields";

export const metadata: Metadata = { title: "Buat Work Order" };

export default async function NewWorkOrderPage() {
  await requireRole("owner", "admin");

  const [customers, mechanics] = await Promise.all([
    prisma.customer.findMany({ orderBy: { companyName: "asc" }, select: { id: true, companyName: true } }),
    prisma.user.findMany({ where: { role: "mechanic", isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <Link href="/work-orders" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Daftar work order
      </Link>
      <PageHeader title="Buat work order" description="Tugaskan mekanik ke lokasi pabrik. Mekanik langsung melihatnya di HP." />

      {customers.length === 0 || mechanics.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          {customers.length === 0 ? (
            <>
              Belum ada customer. <Link href="/customers" className="font-medium underline">Tambahkan customer</Link> dulu.
            </>
          ) : (
            <>
              Belum ada mekanik aktif. Pemilik bisa membuat akun mekanik di menu <span className="font-medium">Pengguna</span>.
            </>
          )}
        </p>
      ) : (
        <div className="max-w-3xl">
          <PageForm action={createWorkOrder} submitLabel="Simpan work order" cancelHref="/work-orders">
            <WorkOrderFields customers={customers} mechanics={mechanics} />
          </PageForm>
        </div>
      )}
    </>
  );
}
