import { z } from "zod";
import { googleClientIdSchema } from "./googleClientIdSchema";

export const updateClientAppSchema = z.object({
  isActive: z.boolean().optional(),
  // null désactive la connexion Google.
  googleClientId: googleClientIdSchema.nullable().optional(),
});
