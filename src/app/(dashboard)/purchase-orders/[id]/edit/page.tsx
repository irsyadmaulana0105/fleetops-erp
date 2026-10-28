import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageForm } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { toDateInput } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { updatePurchaseOrder } from "../../actions";
import { PoHeaderFields } from "../../po-header-fields";
import { PoItemsEditor } from "../../po-items-editor";

export const metadata: Metadata = { title: "Ubah PO" };

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("owner", "admin");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [order, suppliers, spareparts] = await Promise.all([
    prisma.purchaseOrder.findUnique({ where: { id }, include: { items: { orderBy: { id: "asc" } } } }),
    prisma.supplier.findMany({ orderBy: { companyName: "asc" }, select: { id: true, companyName: true, country: true } }),
    prisma.sparepart.findMany({ orderBy: { name: "asc" }, select: { id: true, sku: true, name: true, unit: true, buyPrice: true } }),
  ]);
  if (!order) notFound();
  if (order.status !== "draft") redirect(`/purchase-orders/${id}`);

  return (
    <>
      <Link href={`/purchase-orders/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {order.poNumber}
      </Link>
      <PageHeader title={`Ubah ${order.poNumber}`} description="Isi PO hanya bisa diubah selama masih draft." />
      <PageForm action={updatePurchaseOrder.bind(null, id)} submitLabel="Simpan perubahan" cancelHref={`/purchase-orders/${id}`}>
        <PoHeaderFields
          suppliers={suppliers}
          defaults={{
            supplierId: order.supplierId,
            etaDate: order.etaDate ? toDateInput(order.etaDate) : "",
            trackingNumber: order.trackingNumber,
          }}
        />
        <PoItemsEditor
          spareparts={spareparts.map((part) => ({ ...part, buyPrice: Number(part.buyPrice) }))}
          defaults={order.items.map((item) => ({ sparepartId: item.sparepartId, qty: item.qty, unitPrice: Number(item.unitPrice) }))}
        />
      </PageForm>
    </>
  );
}
