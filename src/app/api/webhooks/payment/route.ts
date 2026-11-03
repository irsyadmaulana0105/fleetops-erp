import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { recordPayment } from "@/lib/services/payment";

export const runtime = "nodejs";

/**
 * Webhook pembayaran generik (Fase 4). Penyedia payment gateway mengirim POST JSON dengan header:
 *   x-fleetops-signature: hex HMAC-SHA256 dari body mentah, dengan kunci PAYMENT_WEBHOOK_SECRET
 *
 * Body:
 *   { "invoice_number": "INV/2026/11/001",        // atau "invoice_id": 123
 *     "payment_method": "Virtual account",
 *     "transaction_ref": "VA-1234567890",          // wajib; kunci idempotensi (BR-9)
 *     "amount": "1500000" atau 1500000,            // rupiah, opsional sen
 *     "paid_at": "2026-11-03T10:15:00+07:00",      // opsional; bawaan = waktu diterima
 *     "notes": "..." }                              // opsional
 *
 * Pengiriman ganda (retry dari gateway) dijawab 200 { status: "duplicate" } tanpa mencatat dua kali.
 */

const webhookSchema = z
  .object({
    invoice_id: z.number().int().positive().optional(),
    invoice_number: z.string().trim().min(1).max(50).optional(),
    payment_method: z.string().trim().min(1).max(50),
    transaction_ref: z.string().trim().min(1).max(100),
    amount: z.union([z.number().positive(), z.string().regex(/^\d{1,13}([.,]\d{1,2})?$/)]),
    paid_at: z.string().datetime({ offset: true }).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.invoice_id !== undefined || value.invoice_number !== undefined, {
    message: "invoice_id atau invoice_number wajib diisi",
  });

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function signatureMatches(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(header.trim().toLowerCase(), "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return json(503, { error: "webhook_not_configured" });

  const rawBody = await request.text();
  if (!signatureMatches(rawBody, request.headers.get("x-fleetops-signature"), secret)) {
    return json(401, { error: "invalid_signature" });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const parsed = webhookSchema.safeParse(payload);
  if (!parsed.success) {
    return json(400, { error: "invalid_payload", detail: z.flattenError(parsed.error).fieldErrors });
  }

  const invoice = parsed.data.invoice_id
    ? await prisma.invoice.findUnique({ where: { id: parsed.data.invoice_id }, select: { id: true } })
    : await prisma.invoice.findUnique({ where: { invoiceNumber: parsed.data.invoice_number }, select: { id: true } });
  if (!invoice) return json(404, { error: "invoice_not_found" });

  const amountString = String(parsed.data.amount).replace(",", ".");
  const result = await recordPayment({
    invoiceId: invoice.id,
    paymentMethod: parsed.data.payment_method,
    transactionRef: parsed.data.transaction_ref,
    amount: new Prisma.Decimal(amountString),
    paidAt: parsed.data.paid_at ? new Date(parsed.data.paid_at) : new Date(),
    notes: parsed.data.notes ?? null,
  });

  if (!result.ok) return json(422, { error: "payment_rejected", message: result.message });
  return json(200, { status: result.duplicate ? "duplicate" : "recorded", invoice_status: result.status });
}
