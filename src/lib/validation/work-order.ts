import { z } from "zod";
import type { ExpenseStatus, PhotoType, WorkOrderStatus } from "@/generated/prisma/client";
import type { BadgeTone } from "@/components/ui/badge";
import { integer, optionalText, requiredText, rupiah } from "./common";
import { requiredWibDateTime } from "./dates";

export const WO_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  scheduled: "Terjadwal",
  in_progress: "Dikerjakan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const WO_STATUS_TONE: Record<WorkOrderStatus, BadgeTone> = {
  scheduled: "neutral",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};

export const PHOTO_TYPE_LABEL: Record<PhotoType, string> = {
  before: "Sebelum",
  process: "Proses",
  after: "Sesudah",
};

export const PHOTO_TYPES = Object.keys(PHOTO_TYPE_LABEL) as PhotoType[];

export function isPhotoType(value: string): value is PhotoType {
  return (PHOTO_TYPES as string[]).includes(value);
}

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export const EXPENSE_STATUS_TONE: Record<ExpenseStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export const MAX_HOUR_METER = 1_000_000;

export const workOrderSchema = z.object({
  customerId: integer({ min: 1 }),
  mechanicId: integer({ min: 1 }),
  unitModel: requiredText(100),
  serialNumber: optionalText(100),
  symptomNotes: requiredText(2000),
  laborFee: rupiah(),
  scheduledAt: requiredWibDateTime(),
});

export const startWorkOrderSchema = z.object({
  hourMeter: integer({ min: 0, max: MAX_HOUR_METER }),
});

export const expenseSchema = z.object({
  description: requiredText(255),
  amount: integer({ min: 1, max: 50_000_000 }),
});
