import { z } from "zod";
import { passwordSchema } from "./passwordSchema";

export const registerSchema = z
 .object({
    firstName: z.string().min(3, {message: "firstNameLength"}),
    lastName: z.string().min(3, {message: "lastNameLength"}),
    email: z.string().email(),
    password: passwordSchema,
    confirmPassword: passwordSchema,
    role: z.enum(["consumer", "tenant"]).optional()
 }).strict();
 


