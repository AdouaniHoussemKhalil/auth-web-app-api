import { z } from "zod";

export const requestMFASchema = z.object({
  email: z.string().email(),
  requestType: z.enum(["activate", "deactivate"]),
});
