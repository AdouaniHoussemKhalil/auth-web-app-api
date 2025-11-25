import { z } from "zod";

export const createClientAppSchema = z.object({
  tenantId: z.string().nonempty({ message: "tenantId is required" }),
  name: z.string().min(2, { message: "name must be at least 2 characters" }),
  tokenExpiresIn: z.string().optional(),
  resetTokenExpiresIn: z.string().optional(),
  mfaExpiresIn: z.string().optional(),
  redirectUrl: z.string().url().optional(),
  resetPasswordUrl: z.string().url().optional(),
  supportEmail: z.string().email(),
  logoUrl: z.string().url().optional(),
  logoutUrl: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#([0-9A-F]{3}){1,2}$/i, {
      message: "primaryColor must be a hex color",
    })
    .optional(),
});
