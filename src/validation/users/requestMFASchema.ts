import { z } from "zod";

export const requestMFASchema = z.object({
  userId: z.string().nonempty({ message: "UserId should not be empty" }),
  requestType: z.enum(["activate", "deactivate"]),
});

