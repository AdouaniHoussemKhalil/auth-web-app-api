import { z } from "zod";
import { googleClientIdSchema } from "./googleClientIdSchema";

export const updateClientAppSchema = z.object({
  isActive: z.boolean().optional(),
  // null désactive la connexion Google.
  googleClientId: googleClientIdSchema.nullable().optional(),
  // Apparence des e-mails ; null retire le logo ou la couleur (valeurs par défaut).
  name: z.string().trim().min(2, { message: "name must be at least 2 characters" }).optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#([0-9A-F]{3}){1,2}$/i, { message: "primaryColor must be a hex color" })
    .nullable()
    .optional(),
  supportEmail: z.string().email().optional(),
});
