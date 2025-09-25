import { z } from "zod";
import { passwordSchema } from "./shared/passwordSchema";

export const updatePasswordSchema = z.object({
  password: passwordSchema,
  userId: z.string().nonempty({ message: "UserId should not be empty" }),
});
