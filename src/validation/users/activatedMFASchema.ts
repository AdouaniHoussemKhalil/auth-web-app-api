import { z } from "zod";

export const activatedMFASchema = z.object({
  userId: z.string().nonempty({ message: "UserId should not be empty" }),
  activationId: z.string().nonempty({ message: "Activation ID should not be empty" }),
});

