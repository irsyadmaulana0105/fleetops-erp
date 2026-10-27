-- CreateEnum
CREATE TYPE "role" AS ENUM ('owner', 'admin', 'mechanic');

-- CreateEnum
CREATE TYPE "sparepart_category" AS ENUM ('filters', 'hydraulics', 'engine', 'electrical', 'tires', 'other');

-- CreateEnum
CREATE TYPE "purchase_order_status" AS ENUM ('draft', 'ordered', 'customs_cleared', 'received', 'cancelled');

-- CreateEnum
CREATE TYPE "quotation_status" AS ENUM ('draft', 'sent', 'approved', 'revised', 'rejected');

-- CreateEnum
CREATE TYPE "quotation_item_type" AS ENUM ('sparepart', 'labor');

-- CreateEnum
CREATE TYPE "work_order_status" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "photo_type" AS ENUM ('before', 'process', 'after');

-- CreateEnum
CREATE TYPE "expense_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('unpaid', 'partially_paid', 'paid', 'overdue');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "role" NOT NULL DEFAULT 'mechanic',
    "phone" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "company_name" VARCHAR(150) NOT NULL,
    "pic_name" VARCHAR(100) NOT NULL,
    "pic_phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(100),
    "address" TEXT NOT NULL,
    "top_days" INTEGER NOT NULL DEFAULT 180,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "company_name" VARCHAR(150) NOT NULL,
    "country" VARCHAR(50) NOT NULL DEFAULT 'Indonesia',
    "contact_person" VARCHAR(100),
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spareparts" (
    "id" SERIAL NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" "sparepart_category" NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 2,
    "buy_price" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sell_price" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'pcs',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spareparts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "po_number" VARCHAR(50) NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "status" "purchase_order_status" NOT NULL DEFAULT 'draft',
    "tracking_number" VARCHAR(100),
    "eta_date" DATE,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "sparepart_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" SERIAL NOT NULL,
    "quotation_number" VARCHAR(50) NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "valid_until" DATE NOT NULL,
    "status" "quotation_status" NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_ppn" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "approval_token" VARCHAR(64),
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" SERIAL NOT NULL,
    "quotation_id" INTEGER NOT NULL,
    "item_type" "quotation_item_type" NOT NULL,
    "sparepart_id" INTEGER,
    "description" VARCHAR(255) NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" SERIAL NOT NULL,
    "wo_number" VARCHAR(50) NOT NULL,
    "quotation_id" INTEGER,
    "customer_id" INTEGER NOT NULL,
    "mechanic_id" INTEGER NOT NULL,
    "unit_model" VARCHAR(100) NOT NULL,
    "serial_number" VARCHAR(100),
    "hour_meter" INTEGER NOT NULL DEFAULT 0,
    "symptom_notes" TEXT NOT NULL,
    "labor_fee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "work_order_status" NOT NULL DEFAULT 'scheduled',
    "customer_signature" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_photos" (
    "id" SERIAL NOT NULL,
    "work_order_id" INTEGER NOT NULL,
    "photo_type" "photo_type" NOT NULL,
    "file_path" VARCHAR(255) NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mechanic_expenses" (
    "id" SERIAL NOT NULL,
    "work_order_id" INTEGER NOT NULL,
    "mechanic_id" INTEGER NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "receipt_photo_path" VARCHAR(255),
    "status" "expense_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mechanic_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "quotation_id" INTEGER NOT NULL,
    "work_order_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'unpaid',
    "subtotal" DECIMAL(15,2) NOT NULL,
    "tax_ppn" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "virtual_account_number" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "transaction_ref" VARCHAR(100),
    "amount" DECIMAL(15,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_customer_company" ON "customers"("company_name");

-- CreateIndex
CREATE UNIQUE INDEX "spareparts_sku_key" ON "spareparts"("sku");

-- CreateIndex
CREATE INDEX "idx_sparepart_category" ON "spareparts"("category");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_sparepart_id_idx" ON "purchase_order_items"("sparepart_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotation_number_key" ON "quotations"("quotation_number");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_approval_token_key" ON "quotations"("approval_token");

-- CreateIndex
CREATE INDEX "quotations_customer_id_idx" ON "quotations"("customer_id");

-- CreateIndex
CREATE INDEX "quotations_status_idx" ON "quotations"("status");

-- CreateIndex
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items"("quotation_id");

-- CreateIndex
CREATE INDEX "quotation_items_sparepart_id_idx" ON "quotation_items"("sparepart_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_wo_number_key" ON "work_orders"("wo_number");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_quotation_id_key" ON "work_orders"("quotation_id");

-- CreateIndex
CREATE INDEX "work_orders_customer_id_idx" ON "work_orders"("customer_id");

-- CreateIndex
CREATE INDEX "work_orders_mechanic_id_idx" ON "work_orders"("mechanic_id");

-- CreateIndex
CREATE INDEX "work_orders_status_scheduled_at_idx" ON "work_orders"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "work_order_photos_work_order_id_idx" ON "work_order_photos"("work_order_id");

-- CreateIndex
CREATE INDEX "mechanic_expenses_work_order_id_idx" ON "mechanic_expenses"("work_order_id");

-- CreateIndex
CREATE INDEX "mechanic_expenses_mechanic_id_idx" ON "mechanic_expenses"("mechanic_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_quotation_id_key" ON "invoices"("quotation_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_work_order_id_key" ON "invoices"("work_order_id");

-- CreateIndex
CREATE INDEX "idx_invoice_status" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "idx_invoice_due_date" ON "invoices"("due_date");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_ref_key" ON "payments"("transaction_ref");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_sparepart_id_fkey" FOREIGN KEY ("sparepart_id") REFERENCES "spareparts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_sparepart_id_fkey" FOREIGN KEY ("sparepart_id") REFERENCES "spareparts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_mechanic_id_fkey" FOREIGN KEY ("mechanic_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_photos" ADD CONSTRAINT "work_order_photos_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanic_expenses" ADD CONSTRAINT "mechanic_expenses_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanic_expenses" ADD CONSTRAINT "mechanic_expenses_mechanic_id_fkey" FOREIGN KEY ("mechanic_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraint dari docs/data-model.md yang belum bisa dideklarasikan di schema.prisma:
-- jumlah barang pada PO impor harus positif.
ALTER TABLE "purchase_order_items"
  ADD CONSTRAINT "purchase_order_items_qty_positive" CHECK ("qty" > 0);
