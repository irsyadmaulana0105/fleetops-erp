# FleetOps ERP

Sistem servis dan sparepart forklift B2B: stok sparepart impor, work order digital untuk mekanik di lapangan, penawaran, dan penagihan dengan TOP hingga 180 hari.

| Komponen | Teknologi |
| :-- | :-- |
| Framework | Next.js 15 (App Router, TypeScript, React 19) |
| Database | PostgreSQL 16 + Prisma ORM 7 (driver adapter `pg`) |
| UI | Tailwind CSS v4, ikon lucide-react |
| PWA | `app/manifest.ts` + `public/sw.js` |
| Deploy | Docker (`docker-compose.yml`), Coolify / VPS |

## Status roadmap

| Fase | Isi | Status |
| :-- | :-- | :-- |
| 0 | Setup, skema Prisma, seed, layout dashboard + PWA | Selesai, menunggu verifikasi |
| 1 | Master data & gudang sparepart | Belum |
| 2 | PO impor & work order mobile mekanik | Belum |
| 3 | Penawaran & invoice TOP 180 hari | Belum |
| 4 | Monitoring finansial, webhook pembayaran, notifikasi | Belum |
| 5 | Hardening, backup, deployment | Belum |

## Menjalankan secara lokal

Prasyarat: Node.js ≥ 20.9 dan PostgreSQL 16.

```bash
npm install
cp .env.example .env          # sesuaikan DATABASE_URL
npm run db:generate           # membuat Prisma Client di src/generated
npm run db:deploy             # menerapkan migrasi ke database
npm run db:seed               # data dummy (hanya development)
npm run dev                   # http://localhost:3000
```

Akun dummy (kata sandi bawaan `Fleetops#2026`, atau isi `SEED_DEFAULT_PASSWORD`):
`owner@fleetops.test`, `admin@fleetops.test`, `mekanik1@fleetops.test`, `mekanik2@fleetops.test`.

Autentikasi belum dibangun di Fase 0. `src/lib/session.ts` mengembalikan pengguna tetap supaya layout dan menu per peran bisa diuji.

## Docker / Coolify

`docker-compose.yml` menjalankan `app` (Next.js) dan `db` (PostgreSQL 16). Jaringan `proxy_net` bersifat eksternal, jadi buat dulu jika menjalankan di luar Coolify:

```bash
docker network create proxy_net
docker compose up -d --build
```

Saat container `app` start, `docker-entrypoint.sh` menjalankan `prisma migrate deploy` (dicoba ulang sampai database siap), lalu `next start`. Health check ada di `GET /api/health`.

Seed tidak dijalankan otomatis di container. Seed menolak berjalan saat `NODE_ENV=production` kecuali `ALLOW_SEED=true`.

## Struktur proyek

```text
prisma/
  schema.prisma          # 11 model utama + 2 tabel item, 9 enum
  migrations/            # migrasi SQL (termasuk CHECK qty > 0 pada PO item)
  seed.ts                # 1 owner, 1 admin, 2 mekanik, 3 customer, 10 sparepart
prisma.config.ts         # URL datasource & perintah seed (Prisma 7)
src/
  app/
    (dashboard)/         # semua halaman ber-sidebar
      layout.tsx         # memasang AppShell
      dashboard/         # halaman dashboard
      [section]/         # halaman sementara untuk modul yang belum dibangun
    api/health/          # health check
    offline/             # halaman saat tidak ada koneksi (PWA)
    manifest.ts
  components/
    layout/              # app-shell, sidebar, header, mobile-nav, brand
    ui/                  # page-header, panel, stat-strip, empty-state
    pwa/sw-register.tsx
  lib/
    prisma.ts            # singleton Prisma Client
    nav.ts               # definisi menu + hak akses per peran
    session.ts           # SEMENTARA: pengguna tetap
    format.ts            # format Rupiah & tanggal
public/sw.js             # service worker
docs/                    # dokumen rujukan asli
```

## Catatan terhadap dokumen di `docs/`

Dokumen rujukan ditulis untuk Laravel + Vue + MySQL. Struktur datanya dipakai apa adanya; yang diterjemahkan:

- DDL MySQL → `schema.prisma` (PostgreSQL). Nama tabel dan kolom tetap snake_case lewat `@map`.
- `ENUM` MySQL → enum native PostgreSQL dengan nilai yang sama.
- `BIGINT` → `Int`, agar id bisa dilewatkan dari Server Component ke Client Component tanpa masalah serialisasi `BigInt`.
- Tabel `mechanic_expenses` dipetakan ke model `Expense`.
- Tabel `purchase_order_items` dan `quotation_items` tetap ada sebagai model karena dibutuhkan relasi pada ERD.
- Relasi 1→1 pada ERD (penawaran → work order → invoice) ditegakkan dengan `@unique`.
- Eloquent trigger (potong stok saat WO selesai, hitung jatuh tempo, ubah status invoice) belum diimplementasikan; itu bagian Fase 2–4 dan akan menjadi logika di service layer, bukan trigger database.
- Penyimpanan Cloudflare R2, Spatie Permission, dan CloudPanel pada dokumen lama tidak dipakai di stack ini.
