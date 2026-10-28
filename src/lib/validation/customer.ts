import { z } from "zod";
import { integer, optionalEmail, requiredPhone, requiredText } from "./common";

/** Batas TOP: nol = bayar di muka; 365 hari = satu tahun. Bawaan perusahaan 180 hari. */
export const TOP_DAYS_DEFAULT = 180;

export const customerSchema = z.object({
  companyName: requiredText(150),
  picName: requiredText(100),
  picPhone: requiredPhone(),
  email: optionalEmail(100),
  address: requiredText(1000),
  topDays: integer({ min: 0, max: 365 }),
});
