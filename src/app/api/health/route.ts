import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Selalu dievaluasi saat request; jangan di-cache saat build.
export const dynamic = "force-dynamic";

/**
 * Health check untuk Coolify / Docker.
 * 200 = aplikasi hidup dan database dapat dijangkau; 503 = database bermasalah.
 * Sengaja tidak membocorkan detail error ke publik.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Health check gagal:", err);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
