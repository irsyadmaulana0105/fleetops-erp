"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authorize, prismaErrorState, submittedValues } from "@/lib/action-helpers";
import { errorState, type ActionState } from "@/lib/action-state";
import { createWithNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import {
  decideManually,
  prepareQuotation,
  recallQuotation,
  regenerateApprovalLink,
  sendQuotation,
} from "@/lib/services/quotation";
import {
  EDITABLE_QUOTATION_STATUSES,
  parseQuotationItems,
  quotationHeaderSchema,
  type QuotationItemInput,
} from "@/lib/validation/quotation";

const OFFICE = ["owner", "admin"] as const;

function revalidateQuotation(id?: number) {
  revalidatePath("/quotations");
  if (id) revalidatePath(`/quotations/${id}`);
  revalidatePath("/dashboard");
}

/** Membaca header dan baris dari form; galat baris ditaruh pada kolom `items`. */
function parseQuotationForm(formData: FormData) {
  const header = quotationHeaderSchema.safeParse(Object.fromEntries(formData));
  const items = parseQuotationItems(formData);
  if (header.success && items.ok) return { ok: true as const, header: header.data, items: items.items };

  const fieldErrors: Record<string, string[]> = header.success ? {} : (z.flattenError(header.error).fieldErrors as Record<string, string[]>);
  if (!items.ok) fieldErrors.items = items.errors;
  const state: ActionState = { status: "error", message: "Periksa kembali isian yang ditandai merah.", fieldErrors, values: submittedValues(formData) };
  return { ok: false as const, state };
}

async function prepared(header: { customerId: number; validUntil: Date; discount: number; applyPpn: boolean; notes: string | null }, items: QuotationItemInput[], formData: FormData) {
  const result = await prepareQuotation({ ...header, items });
  if (result.ok) return { ok: true as const, data: result };
  const state: ActionState = {
    status: "error",
    message: result.message,
    fieldErrors: result.field ? { [result.field]: [result.message] } : undefined,
    values: submittedValues(formData),
  };
  return { ok: false as const, state };
}

export async function createQuotation(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;

  const parsed = parseQuotationForm(formData);
  if (!parsed.ok) return parsed.state;
  const ready = await prepared(parsed.header, parsed.items, formData);
  if (!ready.ok) return ready.state;
  const { header, lines } = ready.data;

  let id: number;
  try {
    const created = await createWithNumber({
      code: "PNW",
      listExisting: async (prefix) =>
        (await prisma.quotation.findMany({ where: { quotationNumber: { startsWith: prefix } }, select: { quotationNumber: true } })).map((q) => q.quotationNumber),
      create: (quotationNumber) =>
        prisma.quotation.create({ data: { quotationNumber, ...header, items: { create: lines } }, select: { id: true } }),
    });
    id = created.id;
  } catch (error) {
    return prismaErrorState(error, { values: submittedValues(formData) });
  }

  revalidateQuotation(id);
  redirect(`/quotations/${id}`);
}

export async function updateQuotation(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;

  const parsed = parseQuotationForm(formData);
  if (!parsed.ok) return parsed.state;
  const ready = await prepared(parsed.header, parsed.items, formData);
  if (!ready.ok) return ready.state;
  const { header, lines } = ready.data;

  try {
    const done = await prisma.$transaction(async (tx) => {
      // Isi hanya boleh berubah selama Draft/Perlu revisi; syaratnya ikut dalam UPDATE agar tidak balapan dengan pengiriman.
      const updated = await tx.quotation.updateMany({ where: { id, status: { in: EDITABLE_QUOTATION_STATUSES } }, data: header });
      if (updated.count !== 1) return false;
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      await tx.quotationItem.createMany({ data: lines.map((line) => ({ ...line, quotationId: id })) });
      return true;
    });
    if (!done) return errorState("Hanya penawaran berstatus Draft atau Perlu revisi yang isinya bisa diubah.");
  } catch (error) {
    return prismaErrorState(error, { values: submittedValues(formData) });
  }

  revalidateQuotation(id);
  redirect(`/quotations/${id}`);
}

type Mutation = () => Promise<{ ok: true } | { ok: false; message: string }>;

async function run(id: number, successMessage: string, mutate: Mutation): Promise<ActionState> {
  try {
    const result = await mutate();
    if (!result.ok) return errorState(result.message);
  } catch (error) {
    return prismaErrorState(error);
  }
  revalidateQuotation(id);
  return { status: "success", message: successMessage };
}

export async function sendQuotationAction(id: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;
  return run(id, "Penawaran siap dikirim. Salin tautannya atau kirim lewat WhatsApp.", () => sendQuotation(id));
}

export async function regenerateLinkAction(id: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;
  return run(id, "Tautan baru dibuat. Tautan lama tidak berlaku lagi.", () => regenerateApprovalLink(id));
}

export async function recallQuotationAction(id: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;
  return run(id, "Penawaran ditarik untuk revisi. Tautan lama tidak berlaku lagi.", () => recallQuotation(id));
}

export async function decideManuallyAction(id: number, decision: "approved" | "rejected", _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;
  return run(id, decision === "approved" ? "Penawaran dicatat disetujui klien." : "Penawaran dicatat ditolak klien.", () =>
    decideManually(id, decision, auth.user.name),
  );
}

export async function deleteQuotation(id: number, _previous: ActionState, _formData: FormData): Promise<ActionState> {
  const auth = await authorize(...OFFICE);
  if (!auth.ok) return auth.state;

  try {
    const deleted = await prisma.quotation.deleteMany({ where: { id, status: "draft", workOrder: null } });
    if (deleted.count !== 1) return errorState("Hanya penawaran berstatus Draft yang bisa dihapus.");
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidateQuotation();
  redirect("/quotations");
}
