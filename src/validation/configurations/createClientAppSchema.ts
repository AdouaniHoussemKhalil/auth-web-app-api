import { z } from "zod";
import ms from "ms";
import { googleClientIdSchema } from "./googleClientIdSchema";

// Durée au format de la librairie `ms` : "15m", "1h", "7d"...
const duration = z.string().refine((value) => typeof ms(value as ms.StringValue) === "number", {
  message: "must be a duration such as 15m, 1h or 7d",
});

const verificationMode = z.enum(["code", "link"]);

/** Mode lien de vérification d'e-mail : URLs de redirection de succès et d'échec obligatoires. */
export const requireVerificationUrls = (
  app: {
    emailVerificationMode?: string | null;
    emailVerifiedUrl?: string | null;
    emailVerificationFailedUrl?: string | null;
  },
  ctx: z.RefinementCtx
) => {
  if (app.emailVerificationMode !== "link") return;
  for (const field of ["emailVerifiedUrl", "emailVerificationFailedUrl"] as const) {
    if (!app[field]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} is required when emailVerificationMode is "link"`,
      });
    }
  }
};

export const createClientAppSchema = z
  .object({
    tenantId: z.string().nonempty({ message: "tenantId is required" }),
    name: z.string().min(2, { message: "name must be at least 2 characters" }),
    tokenExpiresIn: duration.optional(),
    refreshTokenExpiresIn: duration.optional(),
    resetTokenExpiresIn: duration.optional(),
    requireEmailVerification: z.boolean().optional(),
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
    googleClientId: googleClientIdSchema.optional(),
    emailVerificationMode: verificationMode.optional(),
    passwordResetMode: verificationMode.optional(),
    emailVerifiedUrl: z.string().url().optional(),
    emailVerificationFailedUrl: z.string().url().optional(),
  })
  .superRefine(requireVerificationUrls);
