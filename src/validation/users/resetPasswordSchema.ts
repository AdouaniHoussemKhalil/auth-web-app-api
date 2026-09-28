import { z } from "zod";
import { passwordSchema } from "./passwordSchema";

export const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  resetToken: z.string().nonempty({ message: "Reset token should not be empty" }),
  password: passwordSchema,
  confirmPassword: passwordSchema,
});
