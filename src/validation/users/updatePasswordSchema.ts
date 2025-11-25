import { z } from "zod";
import { passwordSchema } from "./passwordSchema";

export const updatePasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: passwordSchema,
  currentPassword: z.string().nonempty({ message: "Current password should not be empty" }),
  userId: z.string().nonempty({ message: "UserId should not be empty" }),
});
