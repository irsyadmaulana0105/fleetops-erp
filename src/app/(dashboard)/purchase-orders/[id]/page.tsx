import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Pencil } from "lucide-react";
import type { PurchaseOrderStatus } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Field, FormDialog } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { buttonClass } from "@/components/ui/styles";
import { toDateInput } from "@/lib/datetime";
import { formatDateOnly, formatDateTime, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { PO_STATUS_LABEL, PO_STATUS_TONE, PO_TRANSITIONS } from "@/lib/validation/purchase-order";
import { changePurchaseOrderStatus, deletePurchaseOrder, updateShipment } from "../actions";

export const metadata: Metadata = { title: "Detail PO" };

/** Tahap normal PO dari kiri ke kanan; "Dibatalkan" ditampilkan terpisah. */
const STAGES: PurchaseOrderStatus[] = ["draft", "ordered", "customs_cleared", "received"];

const NEXT_STEP: Partial<Record<PurchaseOrderStatus, { label: string; confirm: string }>> = {
  ordered: { label: "Tandai dipesan", confirm: "PO sudah dikirim ke supplier. Setelah ini isi barang tidak bisa diubah lagi." },
  customs_cleared: { label: "Tandai lolos bea cukai", confirm: "Barang sudah selesai pengurusan bea cukai." },
  received: {
    label: "Terima barang",
    confirm: "Barang sudah tiba di gudang. Stok setiap sparepart pada PO ini akan bertambah sesuai jumlahnya, dan tindakan ini tidak dapat dibatalkan.",
  },
};

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("owner", "admin");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { sparepart: { select: { sku: true, name: true, unit: true } } }, orderBy: { id: "asc" } } },
  });
  if (!order) notFound();

  const allowed = PO_TRANSITIONS[order.status];
  const forward = allowed.filter((status) => status !== "cancelled");
  const canCancel = allowed.includes("cancelled");
  const isDraft = order.status === "draft";
  const isFinal = allowed.length === 0;
  const stageIndex = STAGES.indexOf(order.status);

  return (
    <>
      <Link href="/purchase-orders" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Daftar PO
      </Link>

      <PageHeader
        title={order.poNumber}
        description={`${order.supplier.companyName}${order.supplier.country !== "Indonesia" ? ` · ${order.supplier.country}` : ""}`}
        actions={<Badge tone={PO_STATUS_TONE[order.status]}>{PO_STATUS_LABEL[order.status]}</Badge>}
      />

      <div className="space-y-6">
        {order.status !== "cancelled" && (
          <ol aria-label="Tahap PO" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STAGES.map((stage, index) => {
              const done = index < stageIndex || order.status === "received";
              const current = index === stageIndex && order.status !== "received";
              return (
                <li
                  key={stage}
                  aria-current={current ? "step" : undefined}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    current ? "border-amber-400 bg-amber-50 font-semibold text-slate-900" : done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {done && <Check aria-hidden="true" className="size-4 shrink-0" />}
                  {PO_STATUS_LABEL[stage]}
                </li>
              );
            })}
          </ol>
        )}

        {!isFinal && (
          <div className="flex flex-wrap gap-2">
            {forward.map((status) => {
              const step = NEXT_STEP[status];
              if (!step) return null;
              const primary = status === forward[0];
              return (
                <FormDialog
                  key={status}
                  triggerLabel={step.label}
                  triggerVariant={primary ? "primary" : "secondary"}
                  title={step.label}
                  submitLabel="Ya, lanjutkan"
                  action={changePurchaseOrderStatus.bind(null, id, status)}
                >
                  <p className="text-sm text-slate-700">{step.confirm}</p>
                </FormDialog>
              );
            })}
            {isDraft && (
              <Link href={`/purchase-orders/${id}/edit`} className={buttonClass("secondary")}>
                <Pencil aria-hidden="true" className="size-4" />
                Ubah isi PO
              </Link>
            )}
            <FormDialog
              triggerLabel="Info pengiriman"
              triggerVariant="secondary"
              title="Info pengiriman"
              submitLabel="Simpan"
              action={updateShipment.bind(null, id)}
            >
              <Field name="trackingNumber" label="Nomor resi / airwaybill" defaultValue={order.trackingNumber} />
              <Field name="etaDate" label="Estimasi tiba" kind="date" defaultValue={order.etaDate ? toDateInput(order.etaDate) : ""} />
            </FormDialog>
            {canCancel && (
              <FormDialog
                triggerLabel="Batalkan PO"
                triggerVariant="ghost"
                title="Batalkan PO?"
                submitLabel="Ya, batalkan"
                destructive
                action={changePurchaseOrderStatus.bind(null, id, "cancelled")}
              >
                <p className="text-sm text-slate-700">
                  PO <strong>{order.poNumber}</strong> akan dibatalkan dan tidak bisa dilanjutkan lagi. Stok tidak berubah.
                </p>
              </FormDialog>
            )}
            {isDraft && (
              <FormDialog
                triggerLabel="Hapus draft"
                triggerVariant="ghost"
                title="Hapus draft PO?"
                submitLabel="Ya, hapus"
                destructive
                action={deletePurchaseOrder.bind(null, id)}
              >
                <p className="text-sm text-slate-700">Draft ini akan dihapus permanen beserta baris barangnya.</p>
              </FormDialog>
            )}
          </div>
        )}

        <Panel title="Ringkasan">
          <dl className="grid gap-x-6 gap-y-4 p-4 text-sm sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
            <Summary label="Supplier" value={order.supplier.companyName} />
            <Summary label="Estimasi tiba" value={order.etaDate ? formatDateOnly(order.etaDate) : "—"} />
            <Summary label="Nomor resi" value={order.trackingNumber ?? "—"} />
            <Summary label="Dibuat" value={formatDateTime(order.createdAt)} />
          </dl>
        </Panel>

        <Panel title={`Barang (${order.items.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Barang pada {order.poNumber}</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium sm:px-5">Barang</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Jumlah</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Harga satuan</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 sm:px-5">
                      <span className="block font-medium text-slate-900">{item.sparepart.name}</span>
                      <span className="block font-mono text-xs text-slate-500">{item.sparepart.sku}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.qty.toLocaleString("id-ID")} <span className="text-slate-500">{item.sparepart.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatRupiah(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium sm:px-5">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <th scope="row" colSpan={3} className="px-4 py-3 text-right font-medium text-slate-700">Total PO</th>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 sm:px-5">{formatRupiah(order.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-slate-900">{value}</dd>
    </div>
  );
}
