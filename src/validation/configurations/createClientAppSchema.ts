import { z } from "zod";
import ms from "ms";

// Durée au format de la librairie `ms` : "15m", "1h", "7d"...
const duration = z.string().refine((value) => typeof ms(value as ms.StringValue) === "number", {
  message: "must be a duration such as 15m, 1h or 7d",
});

export const createClientAppSchema = z.object({
  tenantId: z.string().nonempty({ message: "tenantId is required" }),
  name: z.string().min(2, { message: "name must be at least 2 characters" }),
  tokenExpiresIn: duration.optional(),
  resetTokenExpiresIn: duration.optional(),
  mfaVerificationMode: z.enum(["code", "link"]).optional(),
  mfaExpiresIn: duration.optional(),
  redirectUrl: z.string().url(),
  resetPasswordUrl: z.string().url(),
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
