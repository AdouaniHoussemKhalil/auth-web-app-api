import { z } from "zod";

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
  });

export const verifyResetCodeSchema = z.object({
  email: z.string().email(),
  resetCode: z.string(),
})