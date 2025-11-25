import { z } from "zod";
import { passwordSchema } from "./passwordSchema";

export const resetPasswordSchema = z.object({
    password: passwordSchema,
    confirmPassword: passwordSchema,
    email: z.string().email({ message: "Invalid email address" }).nonempty({ message: "Email should not be empty" }),
  });