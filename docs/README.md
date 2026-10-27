# 📖 Dokumentasi Master & AI Prompting Guide — Forklift Pro ERP

Dokumen ini berfungsi sebagai pusat navigasi teknis dan panduan memberikan prompt (*prompt engineering*) untuk eksekusi **Vibe Coding** menggunakan **Claude Max**, **Cursor**, atau **Windsurf**.

---

## 📑 Daftar Isi Dokumentasi

1. **[System Architecture & Security (`architecture.md`)](./architecture.md)**
   * Topologi Server & Cloudflare Free Tier WAF
   * Stack Teknologi (Laravel 11 + Inertia.js + Vue 3)
   * Alur Kerja Operasional (Quotation $\rightarrow$ Purchase Order Impor $\rightarrow$ Work Order $\rightarrow$ Invoice TOP 180 Hari)
   * Panduan Keamanan (Signed URLs, Encrypted Storage, Rate Limiting)
2. **[Data Model & Database Schema (`data-model.md`)](./data-model.md)**
   * DDL SQL lengkap untuk semua tabel
   * Aturan Relasi ORM Eloquent & Constraint Cascade
   * Indexing & Penanganan jam kerja (*Hour Meter*)

---

## 🎯 Panduan Vibe Coding dengan Claude Max

Untuk mendapatkan hasil kodingan yang presisi dan langsung siap pakai tanpa *bug*, gunakan alur bertahap (*step-by-step module generation*).

### Aturan Emas Prompting:
* **Prinsip Single-Responsibility:** Minta AI membuat 1 modul secara utuh (Migration, Model, Controller, Inertia Page).
* **Sertakan Context Data Model:** Selalu salin bagian tabel terkait dari `docs/data-model.md` ke dalam prompt.
* **Tegaskan Desain UI:** Minta UI dibuat dengan **Tailwind CSS** yang *Mobile-First*, responsif, dan konsisten memakai tema warna `slate` (industrial) dan `amber` (forklift).

---

## 📋 Ready-to-Use Prompt Templates untuk Claude Max

### Prompt 1: Generate Migration & Model Eloquent
```text
Saya sedang membangun sistem Forklift Pro ERP menggunakan Laravel 11.
Tolong buatkan file Migration dan Model Eloquent lengkap untuk modul [NAMA_MODUL] berdasarkan spesifikasi dari `docs/data-model.md` berikut:

[PASTE TABEL TERKAIT DARI docs/data-model.md]

Pastikan:
1. Menggunakan tipe data dan foreign key constraint yang presisi.
2. Menambahkan relasi Eloquent (hasMany, belongsTo, dll) secara lengkap.
3. Menambahkan properti $fillable dan cast tipe data (misal: decimal, date, array JSON).
```

### Prompt 2: Generate Controller & Business Logic
```text
Buatkan Controller Laravel [NAMA_CONTROLLER] menggunakan Inertia.js response untuk menangani operasi CRUD [NAMA_MODUL].

Aturan Bisnis:
1. Gunakan Form Request Validation terpisah untuk store dan update.
2. Sertakan fitur penanganan error transaksi (DB::transaction) jika ada pembaruan stok gudang atau perhitungan uang.
3. Kirim data ke Inertia Page dengan pagination dan filter pencarian.
4. Implementasikan pemisahan role akses (Owner, Admin, Mekanik) menggunakan Policy / Gate.
```

### Prompt 3: Generate Responsive Vue 3 Component (Mobile + Desktop)
```text
Buatkan halaman Vue 3 (Composition API dengan <script setup>) menggunakan Inertia.js dan Tailwind CSS untuk tampilan [NAMA_HALAMAN].

Ketentuan Design & UX:
1. Warna Utama: Industrial Slate (#0f172a) dan Accent Forklift Amber (#f59e0b).
2. Layout Responsif: Tampilan Tabel bersih untuk Desktop, dan Tampilan Card ringkas untuk Layar Mobile (HP Mekanik).
3. Sertakan Modal Form untuk Create/Edit dengan validasi error dari Inertia.
4. Gunakan FontAwesome icons.
5. Gunakan format mata uang Rupiah (Rp) untuk semua angka finansial.
```

---

## 💡 Tips Penyelesaian Problem (Debugging Prompt)

Jika terjadi error saat proses *vibe coding*:
1. Salin pesan error lengkap dari konsol/terminal.
2. Sertakan file Controller dan Vue Component terkait.
3. Berikan instruksi: *"Perbaiki error berikut tanpa mengubah struktur database di data-model.md."*