import { z } from "zod";

export const deactivateMFASchema = z.object({
  userId: z.string().nonempty({ message: "UserId should not be empty" }),
  deactivationId: z.string().nonempty({ message: "Deactivation ID should not be empty" }),
});

