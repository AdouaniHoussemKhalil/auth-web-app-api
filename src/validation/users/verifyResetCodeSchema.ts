import { z } from "zod";

export const verifyResetCodeSchema = z.object({
  email: z.string().email(),
  resetCode: z.string(),
});