import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

/**
 * Gerbang pertama: tanpa token sah → /login.
 * Middleware berjalan di Edge dan tidak punya akses database, jadi ia hanya memeriksa tanda tangan
 * & masa berlaku token. Pemeriksaan peran dan status aktif dilakukan di server (`getCurrentUser`).
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && (await verifySession(token))) return NextResponse.next();

  const url = request.nextUrl.clone();
  const target = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/login";
  url.search = "";
  if (target !== "/") url.searchParams.set("next", target);
  return NextResponse.redirect(url);
}

export const config = {
  // Dikecualikan: halaman login, halaman offline (di-precache service worker), health check, dan aset statis.
  matcher: [
    "/((?!login|offline|api/health|_next/static|_next/image|icons|sw\\.js|manifest\\.webmanifest|icon\\.png|apple-icon\\.png|favicon\\.ico).*)",
  ],
};
