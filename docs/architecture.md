# 🏗️ Arsitektur Sistem, Keamanan & Infrastruktur

Dokumen ini menjelaskan rancangan arsitektur perangkat lunak, infrastruktur berbiaya terjangkau (*Low Cost Infrastructure*), standar keamanan tinggi, serta alur bisnis utama pada sistem **Forklift Pro ERP**.

---

## 1. Topologi Infrastruktur & Server (Low-Cost Enterprise Setup)

Sistem dirancang untuk berjalan pada VPS tunggal berbiaya terjangkau ($\approx \text{Rp } 90.000 - \text{Rp } 120.000/\text{bulan}$) namun sanggup menangani beban kerja tinggi dengan bantuan **Cloudflare Free Tier**.

```text
[ User HP / Laptop Browser ]
             │
             ▼ HTTPS (TLS 1.3)
   ┌──────────────────┐
   │  Cloudflare WAF  │  ◄── Edge Security (DDoS Protection, Rate Limiting, Turnstile)
   └─────────┬────────┘
             │ Reverse Proxy / Encrypted SSL
             ▼
   ┌──────────────────┐
   │ VPS Host Server  │  ◄── UFW Firewall (Only Ports 80, 443, SSH Custom Open)
   │ (CloudPanel App) │
   └─────────┬────────┘
             ├───────────────────────┬───────────────────────┐
             ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │  Nginx Web Server│     │ Laravel 11 App  │     │ PostgreSQL /    │
    │  (HTTP/2 Engine)│     │  (PHP 8.3-FPM)  │     │ MySQL Database  │
    └─────────────────┘     └────────┬────────┘     └─────────────────┘
                                     │
                                     ▼ S3 API (Private Access)
                            ┌─────────────────┐
                            │ Cloudflare R2   │  ◄── Object Storage (Foto & Nota)
                            └─────────────────┘
```

### Komponen Biaya Infrastruktur:
* **VPS (Hetzner CX22 / Biznet Gio / Dewaweb):** 2 vCPU, 4GB RAM $\approx \text{Rp } 90.000/\text{bulan}$.
* **Control Panel:** CloudPanel (Open-Source, Gratis, Sangat Ringan dibanding cPanel).
* **Domain Name (.com / .id):** $\approx \text{Rp } 150.000/\text{tahun}$.
* **Storage & CDN:** Cloudflare R2 (10 GB Gratis/bulan, Tanpa Egress Fee).
* **SSL Certificate:** Let's Encrypt (Gratis via CloudPanel Auto-Renew).

---

## 2. Alur Operasional Bisnis (End-to-End Workflow)

Berikut adalah siklus operasional dari penawaran harga hingga pencairan piutang tempo ($TOP = 180 \text{ hari}$):

```text
  [1. Inbound Request] ──► Klien (Pabrik) mengajukan permintaan servis / sparepart.
           │
           ▼
  [2. Draft Quotation] ──► Admin/Owner input estimasi barang & jasa -> Terbit Penawaran.
           │
           ▼
  [3. Customer Approval] ──► Link Signed URL dikirim via WA/Email -> Klien Klik [Approve].
           │
           ├───────────────────────────────┐
           ▼ (Jika Sparepart Impor/Indent)   ▼ (Jika Stok Ready)
  [4a. PO Impor Supplier]                 [4b. Dispatch Work Order]
  Input Resi & Track ETA                     SPK Digital ke HP Mekanik/Helper
           │                                 │
           └───────────────────────────────┬─┘
                                           ▼
                                  [5. Eksekusi Perbaikan]
                                  Mekanik upload foto before-after
                                  & minta Digital Signature Klien
                                           │
                                           ▼
                                  [6. Issue Invoice & TOP]
                                  Faktur terbit dengan Tempo (TOP 180 Hari)
                                           │
                                           ▼
                                  [7. Automated Reminders]
                                  Notifikasi WA H-14, H-7, H-1 & Webhook VA Bank
                                           │
                                           ▼
                                  [8. Settlement (LUNAS)]
                                  Status Invoice -> PAID, Rekap Kas & PPN
```

---

## 3. Standardisasi Keamanan & Data Protection

### A. Autentikasi & Akses Berbasis Peran (RBAC)
* **Owner (Pemilik PT):** Akses penuh ke Laporan Keuangan, Omset, Approval Piutang TOP, Hapus Data, & Audit Log.
* **Admin Gudang & Office:** Akses CRUD Stok Sparepart, Penerbitan Quotation/Invoice, & Penjadwalan Mekanik.
* **Mekanik / Helper:** Akses terbatas via HP khusus untuk mengisi Work Order yang ditugaskan, upload foto nota/servis, dan meminta tanda tangan digital.

### B. Approval Link Kriptografi (Customer Direct Action)
* Penawaran yang dikirim ke pelanggan menggunakan fitur **Laravel Signed URLs** yang memiliki token HMACSHA256:
  $$\text{URL} = \text{https://ptforklift.com/approve-quotation/QUO-2026-001?expires=1793200000\&signature=a1b2c3...}$$
* Masa berlaku link dibatasi $14 \text{ hari}$. Mencegah pihak tak berwenang memanipulasi parameter URL.

### C. Keamanan File & Asset (Private Uploads)
* Foto tanda tangan digital dan foto nota pengeluaran uang jalan disimpan di Cloudflare R2 dengan status **Private Bucket**.
* File disajikan ke browser menggunakan *Presigned Temporary URL* yang kadaluarsa dalam $15 \text{ menit}$.

### D. Hardening Server & Database
* **Database Isolation:** PostgreSQL/MySQL hanya mendengarkan koneksi lokal (`127.0.0.1`), tidak dibuka ke port publik.
* **Fail2ban Integration:** Server memblokir IP otomatis jika terdapat kesalahan login SSH atau HTTP POST berulang 5 kali dalam 1 menit.
* **Automated Encrypted Backup:** Package `spatie/laravel-backup` mengeksekusi dump database terenkripsi setiap jam 01.00 WIB dan mengirimkannya ke remote storage terpisah.