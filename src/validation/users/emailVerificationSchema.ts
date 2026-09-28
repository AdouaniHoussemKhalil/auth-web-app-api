import { z } from "zod";

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().nonempty({ message: "Code should not be empty" }),
});

export const resendEmailVerificationSchema = z.object({
  email: z.string().email(),
});
