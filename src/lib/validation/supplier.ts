import { z } from "zod";
import { optionalEmail, optionalPhone, optionalText, requiredText } from "./common";

export const supplierSchema = z.object({
  companyName: requiredText(150),
  country: requiredText(50),
  contactPerson: optionalText(100),
  phone: optionalPhone(),
  email: optionalEmail(100),
});
