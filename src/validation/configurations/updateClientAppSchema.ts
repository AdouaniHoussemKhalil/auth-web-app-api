import { z } from "zod";

export const updateClientAppSchema = z.object({
     isActive: z.boolean().optional(),
});