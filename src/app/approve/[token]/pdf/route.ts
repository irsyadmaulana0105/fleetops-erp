import { lookupApproval } from "@/lib/services/quotation";
import { pdfResponse, quotationPdf } from "@/lib/pdf/render";

export const runtime = "nodejs";

/** PDF penawaran untuk klien yang memegang tautan sah. Tautan salah/kedaluwarsa dijawab 404. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lookup = await lookupApproval(token);
  if (lookup.state !== "ok") return new Response("Not found", { status: 404 });
  const file = await quotationPdf(lookup.quotation.id);
  return file ? pdfResponse(file) : new Response("Not found", { status: 404 });
}
