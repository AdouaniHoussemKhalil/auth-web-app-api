import { z } from "zod";

export const googleLoginSchema = z.object({
  token: z.string().nonempty()
});
