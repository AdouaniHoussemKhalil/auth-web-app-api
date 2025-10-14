import { z } from "zod";

export const deactivateMFASchema = z.object({
  userId: z.string().nonempty({ message: "UserId should not be empty" }),
  deactivationToken: z.string().nonempty({ message: "Deactivation token should not be empty" }),
});

