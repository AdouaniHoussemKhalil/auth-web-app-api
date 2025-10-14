import { z } from "zod";

export const activatedMFASchema = z.object({
  userId: z.string().nonempty({ message: "UserId should not be empty" }),
  activationToken:  z.string().nonempty({ message: "Activation token should not be empty" }),
});

