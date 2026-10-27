# 🗄️ Skema Database & Data Model (PostgreSQL / MySQL)

Dokumen ini memuat seluruh rancangan DDL (*Data Definition Language*), tabel relasional, constraint, dan logika ORM Eloquent untuk **Forklift Pro ERP**.

---

## 1. ERD (Entity Relationship Diagram) Text View

* **users** $1 \rightarrow N$ **work_orders** (sebagai Mekanik Penanggung Jawab)
* **customers** $1 \rightarrow N$ **quotations** $1 \rightarrow 1$ **work_orders** $1 \rightarrow 1$ **invoices** $1 \rightarrow N$ **payments**
* **suppliers** $1 \rightarrow N$ **purchase_orders** $1 \rightarrow N$ **purchase_order_items** $N \leftarrow 1$ **spareparts**
* **quotations** $1 \rightarrow N$ **quotation_items** $N \leftarrow 1$ **spareparts**

---

## 2. DDL SQL Schema Definition

### A. Master Data (Users, Customers, Suppliers, Spareparts)

```sql
-- Tabel Pengguna & Akses Role
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('owner', 'admin', 'mechanic') NOT NULL DEFAULT 'mechanic',
    phone VARCHAR(20) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Klien / Perusahaan / Pabrik
CREATE TABLE customers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(150) NOT NULL,
    pic_name VARCHAR(100) NOT NULL,
    pic_phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NULL,
    address TEXT NOT NULL,
    top_days INT NOT NULL DEFAULT 180, -- Terms of Payment dalam Hari (Default 6 Bulan)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_company (company_name)
);

-- Tabel Supplier Impor / Lokal
CREATE TABLE suppliers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(150) NOT NULL,
    country VARCHAR(50) DEFAULT 'Indonesia',
    contact_person VARCHAR(100) NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Inventaris Gudang Sparepart
CREATE TABLE spareparts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category ENUM('filters', 'hydraulics', 'engine', 'electrical', 'tires', 'other') NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 2, -- Threshold Alert Stok Menipis
    buy_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,  -- Harga Modal (HPP)
    sell_price DECIMAL(15,2) NOT NULL DEFAULT 0.00, -- Harga Jual Klien
    unit VARCHAR(20) DEFAULT 'pcs',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sparepart_sku (sku),
    INDEX idx_sparepart_category (category)
);
```

### B. Modul Impor & Pengadaan (Purchase Orders)

```sql
-- PO ke Supplier Sparepart Impor
CREATE TABLE purchase_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    po_number VARCHAR(50) UNIQUE NOT NULL, -- Format: PO-SUP/YYYY/MM/XXX
    supplier_id BIGINT NOT NULL,
    status ENUM('draft', 'ordered', 'customs_cleared', 'received', 'cancelled') DEFAULT 'draft',
    tracking_number VARCHAR(100) NULL,      -- Nomor Airwaybill / Resi Pengiriman
    eta_date DATE NULL,                      -- Estimasi Tiba di Gudang
    total_amount DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);

-- Detail Barang PO Impor
CREATE TABLE purchase_order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    purchase_order_id BIGINT NOT NULL,
    sparepart_id BIGINT NOT NULL,
    qty INT NOT NULL CHECK (qty > 0),
    unit_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (sparepart_id) REFERENCES spareparts(id) ON DELETE RESTRICT
);
```

### C. Modul Transaksi Penawaran (Quotations) & Work Order (WO)

```sql
-- Penawaran Harga Resmi ke Pabrik
CREATE TABLE quotations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    quotation_number VARCHAR(50) UNIQUE NOT NULL, -- Format: PNW/YYYY/MM/XXX
    customer_id BIGINT NOT NULL,
    valid_until DATE NOT NULL,
    status ENUM('draft', 'sent', 'approved', 'revised', 'rejected') DEFAULT 'draft',
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_ppn DECIMAL(15,2) NOT NULL DEFAULT 0.00,      -- PPN 11%
    grand_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    approval_token VARCHAR(64) UNIQUE NULL,            -- Hash Token Signed URL
    approved_at TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- Item Penawaran (Barang & Jasa Servis)
CREATE TABLE quotation_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    quotation_id BIGINT NOT NULL,
    item_type ENUM('sparepart', 'labor') NOT NULL,
    sparepart_id BIGINT NULL,                        -- NULL jika item_type = 'labor'
    description VARCHAR(255) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (sparepart_id) REFERENCES spareparts(id) ON DELETE SET NULL
);

-- Work Order / SPK Digital Mekanik Lapangan
CREATE TABLE work_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    wo_number VARCHAR(50) UNIQUE NOT NULL, -- Format: WO/YYYY/MM/XXX
    quotation_id BIGINT NULL,
    customer_id BIGINT NOT NULL,
    mechanic_id BIGINT NOT NULL,
    unit_model VARCHAR(100) NOT NULL,      -- Contoh: Toyota 8FD25 / Komatsu FD30
    serial_number VARCHAR(100) NULL,
    hour_meter INT NOT NULL DEFAULT 0,     -- Jam kerja forklift saat diperbaiki
    symptom_notes TEXT NOT NULL,           -- Deskripsi kendala mesin
    labor_fee DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    customer_signature LONGTEXT NULL,      -- Base64 / Vector path Tanda Tangan Digital
    scheduled_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (mechanic_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Dokumentasi Foto Lapangan (Before, Process, After)
CREATE TABLE work_order_photos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    work_order_id BIGINT NOT NULL,
    photo_type ENUM('before', 'process', 'after') NOT NULL,
    file_path VARCHAR(255) NOT NULL,       -- URL / Path Cloudflare R2
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

-- Pengeluaran Uang Jalan Mekanik / Helper
CREATE TABLE mechanic_expenses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    work_order_id BIGINT NOT NULL,
    mechanic_id BIGINT NOT NULL,
    description VARCHAR(255) NOT NULL,     -- Misal: Bensin, Tol, Parkir, Konsumsi
    amount DECIMAL(15,2) NOT NULL,
    receipt_photo_path VARCHAR(255) NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (mechanic_id) REFERENCES users(id) ON DELETE RESTRICT
);
```

### D. Modul Penagihan (Invoices) & Piutang (Payments)

```sql
-- Faktur Penagihan TOP (Terms of Payment)
CREATE TABLE invoices (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- Format: INV/YYYY/MM/XXX
    quotation_id BIGINT NOT NULL,
    work_order_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,                      -- issue_date + customer.top_days
    status ENUM('unpaid', 'partially_paid', 'paid', 'overdue') DEFAULT 'unpaid',
    subtotal DECIMAL(15,2) NOT NULL,
    tax_ppn DECIMAL(15,2) NOT NULL,
    discount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0.00,
    virtual_account_number VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE RESTRICT,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    INDEX idx_invoice_status (status),
    INDEX idx_invoice_due_date (due_date)
);

-- Log Penerimaan Pembayaran Masuk
CREATE TABLE payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    invoice_id BIGINT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,        -- Bank Transfer BCA, VA Bank, Check/Giro
    transaction_ref VARCHAR(100) UNIQUE NULL,  -- Reference No / Webhook Payment Gateway ID
    amount DECIMAL(15,2) NOT NULL,
    paid_at DATETIME NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT
);
```

---

## 3. Aturan Bisnis & Eloquent Triggers Logic

1. **Auto-Deduct Sparepart Stock:**
   * Ketika status `work_orders` berubah menjadi `completed`, sistem otomatis mengurangi `spareparts.stock` sesuai item sparepart yang terdaftar pada `quotation_items`.
2. **Auto-Calculate Due Date:**
   * Saat Invoice dibuat: `invoices.due_date` = `invoices.issue_date` + `customers.top_days` (misal 180 hari).
3. **Automatic Invoice Status Shift:**
   * Jika `invoices.paid_amount` $\ge$ `invoices.total_amount` $\rightarrow$ Status berubah menjadi `paid`.
   * Jika Tanggal Hari ini > `invoices.due_date` dan Status = `unpaid` $\rightarrow$ Cron Job otomatis mengubah status menjadi `overdue`.