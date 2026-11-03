-- Fase 3: tautan persetujuan penawaran (masa berlaku + catatan klien) dan rekap reimburse uang jalan.

-- AlterTable
ALTER TABLE "mechanic_expenses" ADD COLUMN     "reimbursed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "approval_expires_at" TIMESTAMP(3),
ADD COLUMN     "response_note" TEXT;
