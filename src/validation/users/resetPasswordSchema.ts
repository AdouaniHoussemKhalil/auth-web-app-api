import { z } from "zod";
import { passwordSchema } from "./passwordSchema";

export const resetPasswordSchema = z.object({
    password: passwordSchema,
  });