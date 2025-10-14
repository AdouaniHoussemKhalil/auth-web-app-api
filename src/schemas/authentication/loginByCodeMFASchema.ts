import { z } from "zod";

export const loginByCodeMFASchema = z.object({
  email: z.string().email(),
  mfaCode: z.string(),
})