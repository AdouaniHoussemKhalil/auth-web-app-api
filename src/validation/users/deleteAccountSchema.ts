import { z } from "zod";

export const deleteConsumerAccountSchema = z.object({
  password: z.string().nonempty({ message: "Password is required to delete the account" }),
});

// Compte avec mot de passe : le mot de passe. Compte Google sans mot de passe : l'adresse e-mail recopiée.
export const deleteTenantAccountSchema = z
  .object({
    password: z.string().nonempty().optional(),
    confirmEmail: z.string().email().optional(),
  })
  .refine((body) => body.password || body.confirmEmail, {
    message: "password or confirmEmail is required",
  });
