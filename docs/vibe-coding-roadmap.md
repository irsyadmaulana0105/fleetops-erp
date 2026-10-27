# 🗺️ Roadmap Execution & Prompt Book — Forklift Pro ERP

> **Panduan Eksekusi Step-by-Step Vibe Coding dari Nol hingga Production Ready menggunakan Claude Max.**

---

## 📌 Ketentuan Umum Vibe Coding

Sebelum memulai, pastikan struktur folder proyek Anda di PC memiliki file dokumentasi berikut:
* `README.md` (Overview Proyek)
* `docs/architecture.md` (Arsitektur & Security)
* `docs/data-model.md` (Skema Database DDL)
* `docs/README.md` (Master Indexing)

Setiap kali Anda berpindah fase di Claude, selalu **lampirkan/paste** file `docs/data-model.md` agar Claude tidak melenceng dari struktur database yang sudah ditetapkan.

---

## 🚀 FASE 0: Initial Setup & Base Architecture

### 🎯 Tujuan Fase 0
Menyiapkan *fresh project* Laravel 11/12 dengan Inertia.js, Vue 3, Tailwind CSS, paket keamanan dasar, dan layout utama web (Responsif Desktop & HP).

### 📋 Checklist Output
- [ ] Install Laravel + Inertia Vue 3 + Tailwind CSS
- [ ] Setup `.env` Database & Storage
- [ ] Spatie Laravel Permission (RBAC)
- [ ] Master Layout (Sidebar Slate `#0f172a`, Accent Amber `#f59e0b`)

---

### 💬 PROMPT FASE 0 (Copy & Paste ke Claude)

```text
Halo Claude! Saya ingin memulai pembuatan proyek "Forklift Pro ERP" dari nol.
Tolong pandu dan buatkan struktur kodingan dasar untuk FASE 0 (Setup & Layout Architecture).

Rujukan File Terlampir:
- docs/architecture.md
- docs/data-model.md

Tugas kamu di FASE 0:
1. Jalankan command instalasi Laravel 11/12 dengan Inertia.js (Vue 3 Composition API), Tailwind CSS v4, dan Spatie Laravel Permission.
2. Buatkan Master Layout Vue (`resources/js/Layouts/AuthenticatedLayout.vue`) yang Mobile-First:
   - Sidebar navigasi untuk Layar Laptop (Desktop view).
   - Bottom navigation / Hamburger Drawer untuk Layar HP (Mobile view).
   - Skema Warna: Background Slate-100, Header/Sidebar Slate-900 (#0f172a), Accent Warna Amber-500 (#f59e0b).
3. Buatkan komponen UI dasar:
   - Header Bar (Nama PT, User Profile, Notification Badge).
   - Toast Notification Component (Flash Message success/error).
   - Modal Dialog Reusable.
4. Buatkan Seeder awal `RoleAndPermissionSeeder.php` dengan 3 Role: `owner`, `admin`, `mechanic`.

Buatkan file-file tersebut dengan kodingan lengkap dan siap pakai.
```

---

## 📦 FASE 1: Master Data & Gudang Sparepart

### 🎯 Tujuan Fase 1
Membangun manajemen pengguna, data klien (pabrik) dengan penentuan TOP (Terms of Payment), data supplier impor, serta inventaris stok sparepart gudang lengkap dengan batas minimal stok (*Low Stock Alert*).

### 📋 Checklist Output
- [ ] Migration & Model (`User`, `Customer`, `Supplier`, `Sparepart`)
- [ ] Controller CRUD dengan DB Transaction & Validation
- [ ] Halaman Vue 3 (Tabel Desktop + Card View Mobile)
- [ ] Widget Stock Alert di Gudang

---

### 💬 PROMPT FASE 1 (Copy & Paste ke Claude)

```text
Claude, sekarang kita masuk ke FASE 1: Master Data & Management Gudang Sparepart.

Rujukan Skema Database (Lihat docs/data-model.md):
- Tabel: `users`, `customers`, `suppliers`, `spareparts`

Tugas kamu di FASE 1:
1. Generate Migration, Model, dan Factory/Seeder untuk 4 tabel di atas.
2. Buatkan Form Request Validation terpisah:
   - `StoreCustomerRequest`, `UpdateCustomerRequest` (memuat input `top_days` default 180 hari).
   - `StoreSparepartRequest`, `UpdateSparepartRequest` (memuat HPP `buy_price`, Harga Jual `sell_price`, `stock`, dan `min_stock`).
3. Buatkan Controller Laravel dengan Inertia Response:
   - `CustomerController.php`
   - `SparepartController.php`
4. Buatkan Halaman UI Vue 3:
   - `resources/js/Pages/Customers/Index.vue`
   - `resources/js/Pages/Spareparts/Index.vue`
   - KETENTUAN UI: Tampilan di Laptop berupa Tabel data yang rapi, sedangkan tampilan di HP Android/iOS otomatis berubah menjadi Grid Cards agar mudah di-scroll oleh user.
   - Tambahkan Badge Alert berwarna Merah jika `stock` <= `min_stock`.

Berikan kode lengkap untuk Migration, Model, FormRequest, Controller, dan Vue Pages.
```

---

## 🛠️ FASE 2: Impor PO & Work Order (WO) Mobile Mekanik

### 🎯 Tujuan Fase 2
Membangun modul pencatatan SPK/Work Order digital untuk mekanik di lapangan via HP (Upload Foto *Before-After*, Tanda Tangan Digital Klien, Reimburs Uang Jalan), serta tracking pengadaan barang impor dari supplier.

### 📋 Checklist Output
- [ ] Migration & Model (`PurchaseOrder`, `WorkOrder`, `WorkOrderPhoto`, `MechanicExpense`)
- [ ] Pad Tanda Tangan Digital (`vue-signature-pad` / HTML5 Canvas)
- [ ] Upload Foto compressed ke Cloudflare R2 / Local Storage
- [ ] Log Uang Jalan & Expense Reimbursement Helper

---

### 💬 PROMPT FASE 2 (Copy & Paste ke Claude)

```text
Claude, lanjutkan ke FASE 2: Modul PO Impor Supplier & Work Order (WO) Digital Mekanik.

Rujukan Skema Database (Lihat docs/data-model.md):
- Tabel: `purchase_orders`, `purchase_order_items`, `work_orders`, `work_order_photos`, `mechanic_expenses`

Tugas kamu di FASE 2:
1. Buatkan Migration & Model Eloquent lengkap dengan relasinya.
2. Buatkan `WorkOrderController.php` yang memiliki fitur:
   - Penugasan Mekanik ke Lokasi Pabrik.
   - Pengecekan jam kerja forklift (`hour_meter`).
   - Fitur upload foto kondisi perbaikan (`before`, `process`, `after`).
   - Fitur simpan Tanda Tangan Digital Klien (Base64 SVG/PNG) langsung dari HP.
   - Fitur input Pengeluaran Uang Jalan Mekanik (`mechanic_expenses`) seperti bensin, tol, parkir.
3. Buatkan Halaman UI Vue 3 Mobile-Optimized:
   - `resources/js/Pages/WorkOrders/Index.vue` (List Tugas Mekanik).
   - `resources/js/Pages/WorkOrders/Execution.vue` (Form Khusus HP Mekanik di Lapangan lengkap dengan Canvas Signature Pad & Camera capture).
4. Buatkan logika trigger: Saat WO berstatus `completed`, stok barang di tabel `spareparts` otomatis berkurang.

Tolong berikan kodingan utuh untuk Backend dan Frontend Vue 3.
```

---

## 📄 FASE 3: Penawaran (Quotation) & Invoice TOP 180 Hari

### 🎯 Tujuan Fase 3
Membangun mesin pembuat Surat Penawaran Harga resmi ber-Kop Surat, link *Approval* otomatis untuk Klien via WhatsApp/Email, otomatisasi penerbitan Faktur (Invoice) dengan perhitungan PPN 11% dan masa jatuh tempo TOP $180 \text{ hari}$ (6 bulan).

### 📋 Checklist Output
- [ ] Migration & Model (`Quotation`, `QuotationItem`, `Invoice`)
- [ ] Signed URL Approval Token untuk Klien
- [ ] Generator PDF Kop Surat PT (DomPDF / Browsershot)
- [ ] Auto-convert Quotation Approved menjadi Invoice & WO

---

### 💬 PROMPT FASE 3 (Copy & Paste ke Claude)

```text
Claude, sekarang kita masuk ke FASE 3: Generator Quotation & Invoice TOP 180 Hari.

Rujukan Skema Database (Lihat docs/data-model.md):
- Tabel: `quotations`, `quotation_items`, `invoices`
- Dokumen Arsitektur: `docs/architecture.md` (Lihat poin Signed URLs & PPN 11%)

Tugas kamu di FASE 3:
1. Buatkan Migration & Model untuk Quotation dan Invoice.
2. Buatkan `QuotationController.php`:
   - Menghitung Subtotal, Diskon, PPN 11%, dan Grand Total.
   - Fitur Generate Signed URL Kriptografi (`URL::signedRoute`) yang bisa dikirim ke WhatsApp/Email Klien untuk approval tanpa perlu login.
   - Endpoint publik untuk Klien mengeklik tombol [Setujui Penawaran] atau [Minta Revisi].
3. Buatkan `InvoiceController.php`:
   - Otomatis menerbitkan Invoice dari Penawaran yang disetujui.
   - Menghitung Tanggal Jatuh Tempo (`due_date` = `issue_date` + `customer.top_days` / 180 hari).
4. Buatkan Template Cetak PDF ber-Kop Surat Resmi PT Forklift:
   - `resources/views/pdf/quotation.blade.php`
   - `resources/views/pdf/invoice.blade.php`
5. Buatkan UI Vue 3 Builder: `resources/js/Pages/Quotations/Create.vue` & `resources/js/Pages/Invoices/Show.vue`.

Sediakan kodingan backend, controller, template PDF, dan Vue UI secara lengkap.
```

---

## 🔔 FASE 4: Monitoring Financial, Webhook Payment & WA Alert

### 🎯 Tujuan Fase 4
Membangun Dashboard Monitoring Finansial khusus Owner (Piutang TOP 6 bulan, Kas Masuk), notifikasi otomatis ke WhatsApp/Email saat ada pembayaran, dan deteksi pembayaran otomatis (*Payment Gateway Webhook* / VA Bank).

### 📋 Checklist Output
- [ ] Dashboard Finansial & Aging Schedule Piutang (`OVERDUE`, `UNPAID`, `PAID`)
- [ ] Tabel `payments` & Integration Webhook Payment Gateway
- [ ] Mailer Notification & Auto-BCC Owner (`OwnerQuotationAlert`)
- [ ] Cron Job Automatic Shift Status Invoice ke `overdue`

---

### 💬 PROMPT FASE 4 (Copy & Paste ke Claude)

```text
Claude, lanjutkan ke FASE 4: Financial Monitoring, Webhook Payment, & Notification System.

Rujukan Skema Database (Lihat docs/data-model.md):
- Tabel: `payments`, `invoices`, `customers`

Tugas kamu di FASE 4:
1. Buatkan Migration & Model `Payment.php`.
2. Buatkan `DashboardController.php` untuk Role Owner:
   - Rekapitulasi Total Omset, Total Piutang Tempo ($TOP = 180 \text{ hari}$), Total Invoice Overdue, dan Stok Kritis Gudang.
   - Aging Schedule Piutang Klien (Kategori: 0-30 hari, 31-90 hari, 91-180 hari, Overdue >180 hari).
3. Buatkan Webhook Controller `PaymentWebhookController.php`:
   - Menerima mutasi pembayaran masuk dari Virtual Account Bank / Payment Gateway.
   - Mengubah status Invoice dari `unpaid` ke `paid` secara instan.
   - Mengirim Notifikasi Email & WhatsApp instan ke Owner ("Pembayaran INV-xxx Rp XX.XXX.XXX LUNAS").
4. Buatkan Artisan Command `php artisan invoices:check-overdue`:
   - Berjalan harian via Scheduler untuk memindai invoice yang melewai `due_date` dan mengubah statusnya menjadi `overdue`.
5. Buatkan UI Dashboard Vue 3: `resources/js/Pages/Dashboard/Owner.vue` lengkap dengan Chart (Chart.js / ApexCharts).

Berikan kodingan lengkap untuk Controller, Command Scheduler, Mailer/Notification, dan Vue Component.
```

---

## 🛡️ FASE 5: Security Hardening, Backup & Server Deployment

### 🎯 Tujuan Fase 5
Mengamankan sistem sebelum dipublikasikan ke server VPS, konfigurasi Cloudflare WAF, enkripsi data, dan otomatisasi backup database harian ke Cloudflare R2 / Remote Storage.

### 📋 Checklist Output
- [ ] Integrasi `spatie/laravel-backup` (Auto-backup DB terenkripsi)
- [ ] Middleware Rate-Limiting & Sanitasi Input XSS
- [ ] Presigned Temporary URL untuk Asset Foto & Signature
- [ ] File Konfigurasi Nginx CloudPanel & Script Deployment

---

### 💬 PROMPT FASE 5 (Copy & Paste ke Claude)

```text
Claude, ini adalah FASE 5 (Terakhir): Hardening Keamanan, Backup, & Server Deployment Setup.

Rujukan Dokumen: `docs/architecture.md`

Tugas kamu di FASE 5:
1. Konfigurasi `spatie/laravel-backup` untuk melakukan dump database PostgreSQL/MySQL, di-compress, dienkripsi, dan diunggah otomatis ke Cloudflare R2 (S3 API Compatible) setiap jam 01:00 WIB.
2. Implementasikan middleware keamanan pada Laravel:
   - Rate limiting ketat pada endpoint sensitif (misal: maximum 5 request/menit pada login & webhook).
   - Sanitasi input request untuk mencegah serangan XSS.
3. Buatkan Service Helper untuk menyajikan foto *before-after* perbaikan dan tanda tangan digital menggunakan Presigned Temporary URL (expired dalam 15 menit).
4. Buatkan file panduan deployment server:
   - Nginx Virtual Host config untuk CloudPanel / VPS.
   - Script bash `deploy.sh` untuk otomatisasi `git pull`, `composer install`, `php artisan migrate --force`, `npm run build`, dan `php artisan optimize`.

Berikan file konfigurasi, middleware, service helper, dan script bash deployment tersebut secara mendalam.
```