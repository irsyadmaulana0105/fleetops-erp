import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Circle, Gauge, MapPin, Phone, Receipt } from "lucide-react";
import type { PhotoType } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Field, FormDialog } from "@/components/ui/form";
import { ImageInput } from "@/components/ui/image-input";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { buttonClass } from "@/components/ui/styles";
import { toWibLocalInput } from "@/lib/datetime";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  EXPENSE_STATUS_LABEL,
  EXPENSE_STATUS_TONE,
  PHOTO_TYPE_LABEL,
  PHOTO_TYPES,
  WO_STATUS_LABEL,
  WO_STATUS_TONE,
} from "@/lib/validation/work-order";
import {
  addExpense,
  cancelWorkOrder,
  completeWorkOrder,
  deleteExpense,
  deletePhoto,
  reviewExpense,
  startWorkOrder,
  updateWorkOrder,
} from "../actions";
import { WorkOrderFields } from "../work-order-fields";
import { PhotoUploader } from "./photo-uploader";
import { SignaturePad } from "./signature-pad";

export const metadata: Metadata = { title: "Detail Work Order" };

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      mechanic: { select: { name: true, phone: true } },
      photos: { orderBy: { uploadedAt: "asc" } },
      expenses: { orderBy: { createdAt: "asc" } },
      quotation: { select: { quotationNumber: true } },
    },
  });
  // Mekanik hanya boleh membuka WO miliknya; selain itu seolah-olah tidak ada.
  if (!workOrder || (user.role === "mechanic" && workOrder.mechanicId !== user.id)) notFound();

  const isMechanic = user.role === "mechanic";
  const isOffice = !isMechanic;
  const { status } = workOrder;
  const working = isMechanic && status === "in_progress";
  const showReport = status === "in_progress" || status === "completed";

  const photosOf = (type: PhotoType) => workOrder.photos.filter((photo) => photo.photoType === type);
  const hasBefore = photosOf("before").length > 0;
  const hasAfter = photosOf("after").length > 0;
  const hasSignature = workOrder.customerSignature !== null;
  const ready = hasBefore && hasAfter && hasSignature;

  const expenseTotal = (filter?: (s: string) => boolean) =>
    workOrder.expenses.filter((e) => (filter ? filter(e.status) : true)).reduce((sum, e) => sum + Number(e.amount), 0);

  const [customers, mechanics] =
    isOffice && status === "scheduled"
      ? await Promise.all([
          prisma.customer.findMany({ orderBy: { companyName: "asc" }, select: { id: true, companyName: true } }),
          prisma.user.findMany({ where: { role: "mechanic", isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        ])
      : [[], []];

  return (
    <>
      <Link href="/work-orders" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {isMechanic ? "Tugas saya" : "Daftar work order"}
      </Link>

      <PageHeader
        title={workOrder.woNumber}
        description={workOrder.customer.companyName}
        actions={
          <>
            <Badge tone={WO_STATUS_TONE[status]}>{WO_STATUS_LABEL[status]}</Badge>
            {isOffice && status === "scheduled" && (
              <FormDialog
                triggerLabel="Ubah"
                triggerIcon="pencil"
                triggerVariant="secondary"
                title="Ubah work order"
                submitLabel="Simpan perubahan"
                action={updateWorkOrder.bind(null, id)}
              >
                <WorkOrderFields
                  customers={customers}
                  mechanics={mechanics}
                  defaults={{
                    customerId: workOrder.customerId,
                    mechanicId: workOrder.mechanicId,
                    unitModel: workOrder.unitModel,
                    serialNumber: workOrder.serialNumber,
                    symptomNotes: workOrder.symptomNotes,
                    laborFee: Number(workOrder.laborFee),
                    scheduledAt: toWibLocalInput(workOrder.scheduledAt),
                  }}
                />
              </FormDialog>
            )}
            {isOffice && (status === "scheduled" || status === "in_progress") && (
              <FormDialog
                triggerLabel="Batalkan"
                triggerVariant="ghost"
                title="Batalkan work order?"
                submitLabel="Ya, batalkan"
                destructive
                action={cancelWorkOrder.bind(null, id)}
              >
                <p className="text-sm text-slate-700">
                  <strong>{workOrder.woNumber}</strong> akan dibatalkan dan mekanik tidak bisa lagi mengerjakannya. Stok tidak berubah.
                </p>
              </FormDialog>
            )}
          </>
        }
      />

      <div className="space-y-6">
        <Panel title="Informasi pekerjaan">
          <dl className="grid gap-x-6 gap-y-4 p-4 text-sm sm:grid-cols-2 sm:p-5">
            <Info label="Lokasi">
              <span className="flex items-start gap-1.5">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <span>
                  <span className="block font-medium text-slate-900">{workOrder.customer.companyName}</span>
                  <span className="block text-slate-600">{workOrder.customer.address}</span>
                </span>
              </span>
            </Info>
            <Info label="Kontak di lokasi">
              <span className="block font-medium text-slate-900">{workOrder.customer.picName}</span>
              <a href={`tel:${workOrder.customer.picPhone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1.5 text-slate-700 underline decoration-amber-500 decoration-2 underline-offset-4">
                <Phone aria-hidden="true" className="size-4" />
                {workOrder.customer.picPhone}
              </a>
            </Info>
            <Info label="Unit">
              <span className="block font-medium text-slate-900">{workOrder.unitModel}</span>
              {workOrder.serialNumber && <span className="block text-slate-600">No. seri {workOrder.serialNumber}</span>}
            </Info>
            <Info label="Jadwal">{formatDateTime(workOrder.scheduledAt)}</Info>
            <Info label="Keluhan / pekerjaan" wide>
              <span className="whitespace-pre-line">{workOrder.symptomNotes}</span>
            </Info>
            {status !== "scheduled" && (
              <Info label="Hour meter">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                  <Gauge aria-hidden="true" className="size-4 text-slate-400" />
                  {workOrder.hourMeter.toLocaleString("id-ID")} jam
                </span>
              </Info>
            )}
            {isOffice && (
              <>
                <Info label="Mekanik">{workOrder.mechanic.name}</Info>
                <Info label="Ongkos jasa">{formatRupiah(workOrder.laborFee)}</Info>
              </>
            )}
            {workOrder.completedAt && <Info label="Selesai">{formatDateTime(workOrder.completedAt)}</Info>}
            {workOrder.quotation && <Info label="Penawaran">{workOrder.quotation.quotationNumber}</Info>}
          </dl>
        </Panel>

        {isMechanic && status === "scheduled" && (
          <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-slate-900">Siap mulai bekerja?</h2>
            <p className="mt-1 text-sm text-slate-700">Catat hour meter forklift saat Anda tiba, lalu mulai pekerjaan.</p>
            <div className="mt-4">
              <FormDialog
                triggerLabel="Mulai pekerjaan"
                triggerVariant="primary"
                title="Mulai pekerjaan"
                description="Lihat angka hour meter pada panel unit."
                submitLabel="Mulai"
                action={startWorkOrder.bind(null, id)}
              >
                <Field name="hourMeter" label="Hour meter (jam)" kind="number" min={0} required defaultValue={workOrder.hourMeter || ""} />
              </FormDialog>
            </div>
          </section>
        )}

        {showReport && (
          <Panel title="Foto dokumentasi">
            <div className="divide-y divide-slate-100">
              {PHOTO_TYPES.map((type) => {
                const photos = photosOf(type);
                return (
                  <div key={type} className="space-y-3 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {PHOTO_TYPE_LABEL[type]} <span className="font-normal text-slate-500">({photos.length})</span>
                        {(type === "before" || type === "after") && photos.length === 0 && <span className="ml-2 text-xs font-medium text-red-700">wajib</span>}
                      </h3>
                    </div>
                    {photos.length > 0 && (
                      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {photos.map((photo) => (
                          <li key={photo.id} className="relative">
                            <a href={`/files/${photo.filePath}`} target="_blank" rel="noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/files/${photo.filePath}`}
                                alt={`Foto ${PHOTO_TYPE_LABEL[type].toLowerCase()} ${formatDateTime(photo.uploadedAt)}`}
                                loading="lazy"
                                className="aspect-square w-full rounded-lg border border-slate-200 object-cover"
                              />
                            </a>
                            {working && (
                              <div className="absolute right-1 top-1 rounded-md bg-white/90 shadow">
                                <FormDialog
                                  triggerLabel="Hapus foto"
                                  triggerIcon="trash"
                                  triggerVariant="ghost"
                                  iconOnly
                                  title="Hapus foto?"
                                  submitLabel="Ya, hapus"
                                  destructive
                                  action={deletePhoto.bind(null, id, photo.id)}
                                >
                                  <p className="text-sm text-slate-700">Foto ini akan dihapus permanen.</p>
                                </FormDialog>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {working && <PhotoUploader workOrderId={id} photoType={type} label={PHOTO_TYPE_LABEL[type]} />}
                    {!working && photos.length === 0 && <p className="text-sm text-slate-500">Belum ada foto.</p>}
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {showReport && (
          <Panel title="Tanda tangan klien">
            <div className="p-4 sm:p-5">
              {working ? (
                <SignaturePad workOrderId={id} savedPath={workOrder.customerSignature} version={workOrder.updatedAt.getTime()} />
              ) : workOrder.customerSignature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/files/${workOrder.customerSignature}?v=${workOrder.updatedAt.getTime()}`} alt="Tanda tangan klien" className="h-32 rounded-lg border border-slate-200 bg-white p-2" />
              ) : (
                <p className="text-sm text-slate-500">Belum ada tanda tangan.</p>
              )}
            </div>
          </Panel>
        )}

        {showReport && (
          <Panel title="Uang jalan">
            {workOrder.expenses.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 sm:p-5">Belum ada pengeluaran.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {workOrder.expenses.map((expense) => (
                  <li key={expense.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{expense.description}</p>
                      <p className="text-sm text-slate-600">
                        {formatRupiah(expense.amount)} · {formatDateTime(expense.createdAt)}
                        {expense.receiptPhotoPath && (
                          <>
                            {" · "}
                            <a href={`/files/${expense.receiptPhotoPath}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-amber-500 decoration-2 underline-offset-4">
                              <Receipt aria-hidden="true" className="size-3.5" />
                              Kuitansi
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={EXPENSE_STATUS_TONE[expense.status]}>{EXPENSE_STATUS_LABEL[expense.status]}</Badge>
                      {isOffice && expense.status === "pending" && (
                        <>
                          <FormDialog
                            triggerLabel="Setujui"
                            triggerVariant="secondary"
                            title="Setujui pengeluaran?"
                            submitLabel="Setujui"
                            action={reviewExpense.bind(null, expense.id, "approved")}
                          >
                            <p className="text-sm text-slate-700">
                              {expense.description} sebesar <strong>{formatRupiah(expense.amount)}</strong> akan disetujui untuk diganti.
                            </p>
                          </FormDialog>
                          <FormDialog
                            triggerLabel="Tolak"
                            triggerVariant="ghost"
                            title="Tolak pengeluaran?"
                            submitLabel="Tolak"
                            destructive
                            action={reviewExpense.bind(null, expense.id, "rejected")}
                          >
                            <p className="text-sm text-slate-700">
                              {expense.description} sebesar <strong>{formatRupiah(expense.amount)}</strong> akan ditolak.
                            </p>
                          </FormDialog>
                        </>
                      )}
                      {isMechanic && expense.status === "pending" && (
                        <FormDialog
                          triggerLabel={`Hapus ${expense.description}`}
                          triggerIcon="trash"
                          triggerVariant="ghost"
                          iconOnly
                          title="Hapus pengeluaran?"
                          submitLabel="Ya, hapus"
                          destructive
                          action={deleteExpense.bind(null, id, expense.id)}
                        >
                          <p className="text-sm text-slate-700">
                            {expense.description} ({formatRupiah(expense.amount)}) akan dihapus.
                          </p>
                        </FormDialog>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
              <p className="text-sm text-slate-600">
                Total <span className="font-semibold text-slate-900">{formatRupiah(expenseTotal())}</span>
                {" · "}Disetujui <span className="font-medium text-slate-900">{formatRupiah(expenseTotal((s) => s === "approved"))}</span>
              </p>
              {isMechanic && (
                <FormDialog
                  triggerLabel="Catat pengeluaran"
                  triggerIcon="plus"
                  triggerVariant="secondary"
                  title="Catat uang jalan"
                  description="Bensin, tol, parkir, konsumsi, dan sejenisnya."
                  submitLabel="Simpan"
                  action={addExpense.bind(null, id)}
                >
                  <Field name="description" label="Keperluan" required placeholder="Tol Sidoarjo–Gempol" />
                  <Field name="amount" label="Jumlah (Rp)" kind="number" min={1} required />
                  <ImageInput name="receipt" label="Foto kuitansi" hint="Opsional." />
                </FormDialog>
              )}
            </div>
          </Panel>
        )}

        {working && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-base font-semibold text-slate-900">Selesaikan pekerjaan</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              <ChecklistItem ok={hasBefore} label="Foto sebelum" />
              <ChecklistItem ok={hasAfter} label="Foto sesudah" />
              <ChecklistItem ok={hasSignature} label="Tanda tangan klien" />
            </ul>
            <div className="mt-4">
              {ready ? (
                <FormDialog
                  triggerLabel="Selesaikan pekerjaan"
                  triggerVariant="primary"
                  title="Selesaikan pekerjaan?"
                  submitLabel="Ya, selesaikan"
                  action={completeWorkOrder.bind(null, id)}
                >
                  <p className="text-sm text-slate-700">
                    Setelah selesai, foto dan tanda tangan tidak bisa diubah. Stok sparepart yang tercantum pada penawaran akan dikurangi otomatis.
                  </p>
                </FormDialog>
              ) : (
                <button type="button" disabled className={buttonClass("primary")}>
                  Lengkapi dulu syarat di atas
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function Info({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-slate-900">{children}</dd>
    </div>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-emerald-800" : "text-slate-600"}`}>
      {ok ? <Check aria-hidden="true" className="size-4" /> : <Circle aria-hidden="true" className="size-4" />}
      {label}
      <span className="sr-only">{ok ? "sudah" : "belum"}</span>
    </li>
  );
}
