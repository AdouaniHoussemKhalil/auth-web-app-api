import { z } from "zod";

// Compte avec mot de passe : le mot de passe. Compte Google sans mot de passe : l'adresse e-mail recopiée.
const deleteAccountConfirmationSchema = z
  .object({
    password: z.string().nonempty().optional(),
    confirmEmail: z.string().email().optional(),
  })
  .refine((body) => body.password || body.confirmEmail, {
    message: "password or confirmEmail is required",
  });

export const deleteConsumerAccountSchema = deleteAccountConfirmationSchema;
export const deleteTenantAccountSchema = deleteAccountConfirmationSchema;
