import { z } from "zod";

export const refreshTokenSchema = z.object({
  refreshToken: z.string().nonempty({ message: "Refresh token should not be empty" }),
});

export const logoutSchema = refreshTokenSchema.extend({
  allDevices: z.boolean().optional(),
});
