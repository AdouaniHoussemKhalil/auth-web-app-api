import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, { message: "passwordLength" })
  .refine((val) => /[a-z]/.test(val), { message: "passwordMissingLowerCase" })
  .refine((val) => /[A-Z]/.test(val), { message: "passwordMissingUppercase" })
  .refine((val) => /[0-9]/.test(val), { message: "passwordMissingNumber" })
  .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), { message: "passwordMissingSpecial" });
