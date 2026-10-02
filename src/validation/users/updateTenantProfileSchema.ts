import { z } from "zod";

// Mêmes règles qu'à l'inscription (registerSchema).
export const updateTenantProfileSchema = z
  .object({
    firstName: z.string().trim().min(3, { message: "firstNameLength" }),
    lastName: z.string().trim().min(3, { message: "lastNameLength" }),
  })
  .strict();
