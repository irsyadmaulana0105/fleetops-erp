/*
 * Service worker FleetOps — Fase 0 (kerangka PWA).
 *
 * Sengaja konservatif:
 *  - Aset statis build (/_next/static, /icons): cache-first (nama berkas ber-hash, aman).
 *  - Navigasi halaman: network-first; jika offline tampilkan /offline.
 *  - Halaman HTML, /api, dan respons ber-cookie TIDAK disimpan di cache, karena memuat
 *    data bisnis & sesi pengguna (invoice, piutang, dsb.).
 *
 * Mode offline untuk Work Order mekanik (antrean unggah foto/tanda tangan) dirancang
 * terpisah di Fase 2.
 *
 * Naikkan VERSION setiap mengubah berkas ini agar cache lama dibersihkan.
 */
const VERSION = "v1";
const STATIC_CACHE = `fleetops-static-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("fleetops-static-") && k !== STATIC_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Halaman: network-first, fallback ke halaman offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(OFFLINE_URL)) ?? Response.error();
      }),
    );
    return;
  }

  // Aset statis ber-hash & ikon: cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
