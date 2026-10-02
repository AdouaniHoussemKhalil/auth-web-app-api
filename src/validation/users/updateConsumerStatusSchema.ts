import { z } from "zod";

export const updateConsumerStatusSchema = z.object({ isActive: z.boolean() }).strict();
