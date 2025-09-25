import { z } from "zod";
import { passwordSchema } from "./shared/passwordSchema";

export const resetPasswordSchema = z.object({
    password: passwordSchema,
  });