import { evaluateOverdue } from "@/lib/services/payment";

export const runtime = "nodejs";

/**
 * Evaluasi harian jatuh tempo (BR-8): invoice unpaid/partially_paid yang lewat `due_date`
 * menjadi `overdue`. Idempoten, aman dipanggil berulang.
 *
 * Panggil sekali sehari, mis. dari penjadwal di host:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://erp.contoh.co.id/api/cron/overdue
 * (di gambar Docker bisa dari cron container, systemd timer, atau penjadwal eksternal).
 */

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response(JSON.stringify({ error: "cron_not_configured" }), { status: 503 });
  const header = request.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });

  const updated = await evaluateOverdue();
  return new Response(JSON.stringify({ ok: true, updated }), { status: 200, headers: { "content-type": "application/json" } });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
