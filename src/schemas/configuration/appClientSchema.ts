import { z } from "zod";

export const AppClientSchema = z.object({
  name: z.string().nonempty({ message: "Name should not be empty" }),
  tokenExpiresIn: z.string().nonempty({ message: "Token expiration time should not be empty" }),
  redirectUrl: z.string().nonempty({ message: "Redirect URL should not be empty" }),
});

