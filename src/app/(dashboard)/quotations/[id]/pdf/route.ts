import { getCurrentUser } from "@/lib/session";
import { pdfResponse, quotationPdf } from "@/lib/pdf/render";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === "mechanic") return new Response("Not found", { status: 404 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const file = await quotationPdf(id);
  return file ? pdfResponse(file) : new Response("Not found", { status: 404 });
}
