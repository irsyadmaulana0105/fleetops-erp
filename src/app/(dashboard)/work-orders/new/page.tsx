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

export default async function NewWorkOrderPage({ searchParams }: { searchParams: Promise<{ quotationId?: string }> }) {
  await requireRole("owner", "admin");
  const rawQuotationId = Number((await searchParams).quotationId);
  const source = Number.isInteger(rawQuotationId) && rawQuotationId > 0
    ? await prisma.quotation.findUnique({
        where: { id: rawQuotationId },
        select: { id: true, quotationNumber: true, status: true, customerId: true, notes: true, items: { select: { itemType: true, description: true, subtotal: true } }, workOrder: { select: { id: true } } },
      })
    : null;
  const usable = source && source.status === "approved" && !source.workOrder ? source : null;
  const laborFee = usable ? usable.items.filter((i) => i.itemType === "labor").reduce((sum, i) => sum + Number(i.subtotal), 0) : 0;
  const workSummary = usable ? usable.items.map((i) => `- ${i.description}`).join("\n") : "";

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
      <PageHeader title="Buat work order" description={usable ? `Dari penawaran ${usable.quotationNumber}. Customer dan ongkos jasa mengikuti penawaran.` : "Tugaskan mekanik ke lokasi pabrik. Mekanik langsung melihatnya di HP."} />

      {source && !usable && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {source.workOrder ? "Penawaran ini sudah punya work order." : "Penawaran ini belum disetujui, jadi belum bisa dibuatkan work order."}{" "}
          <Link href={`/quotations/${source.id}`} className="font-medium underline">Kembali ke penawaran</Link>
        </p>
      )}

      {source && !usable ? null : customers.length === 0 || mechanics.length === 0 ? (
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
            <WorkOrderFields
              customers={customers}
              mechanics={mechanics}
              quotationId={usable?.id}
              defaults={usable ? { customerId: usable.customerId, symptomNotes: workSummary, laborFee } : undefined}
            />
          </PageForm>
        </div>
      )}
    </>
  );
}
