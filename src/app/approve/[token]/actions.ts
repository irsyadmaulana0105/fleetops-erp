"use server";

import { revalidatePath } from "next/cache";
import { parseForm, prismaErrorState } from "@/lib/action-helpers";
import { errorState, type ActionState } from "@/lib/action-state";
import { decideByCustomer } from "@/lib/services/quotation";
import { customerDecisionSchema } from "@/lib/validation/quotation";

/**
 * Keputusan klien dari halaman publik. Tidak ada sesi login: kewenangan sepenuhnya berasal dari tautan
 * (nonce + HMAC + masa berlaku) yang diperiksa ulang di `decideByCustomer`.
 */
export async function customerDecision(
  token: string,
  decision: "approved" | "revised" | "rejected",
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(customerDecisionSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const result = await decideByCustomer(token, decision, parsed.data.note);
    if (!result.ok) return errorState(result.message);
  } catch (error) {
    return prismaErrorState(error);
  }

  revalidatePath(`/approve/${token}`);
  revalidatePath("/quotations");
  revalidatePath("/dashboard");
  return {
    status: "success",
    message: decision === "approved" ? "Terima kasih, penawaran disetujui." : decision === "revised" ? "Permintaan revisi terkirim." : "Penawaran ditolak.",
  };
}
