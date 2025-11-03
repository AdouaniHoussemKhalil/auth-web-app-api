import { z } from "zod";

export const createClientAppSchema = z.object({
  body: z.object({
    tenantId: z.string().uuid({ message: "tenantId must be a valid UUID" }),
    name: z.string().min(2, { message: "name must be at least 2 characters" }),
    tokenExpiresIn: z.number().int().positive(),
    resetTokenExpiresIn: z.number().int().positive(),
    mfaExpiresIn: z.number().int().positive(),
    redirectUrl: z.string().url(),
    supportEmail: z.string().email(),
    logoUrl: z.string().url().optional(),
    primaryColor: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, { message: "primaryColor must be a hex color" }),
  }),
});