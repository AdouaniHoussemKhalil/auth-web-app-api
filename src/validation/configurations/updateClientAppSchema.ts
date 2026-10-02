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
  // URLs et vérification ; null retire une URL optionnelle.
  redirectUrl: z.string().url().optional(),
  resetPasswordUrl: z.string().url().optional(),
  logoutUrl: z.string().url().nullable().optional(),
  emailVerifiedUrl: z.string().url().nullable().optional(),
  emailVerificationFailedUrl: z.string().url().nullable().optional(),
  emailVerificationMode: z.enum(["code", "link"]).optional(),
  passwordResetMode: z.enum(["code", "link"]).optional(),
  mfaVerificationMode: z.enum(["code", "link"]).optional(),
  requireEmailVerification: z.boolean().optional(),
});
