import { z } from "zod";

export const updateProfileSchema = z
  .object({
    userId: z
    .string()
    .nonempty({ message: "UserId should not be empty" }),
    newFirstName: z
      .string()
      .min(3, { message: "First name must contain at least 3 character(s)" })
      .nullable(),
    newLastName: z
      .string()
      .min(3, { message: "Last name must contain at least 3 character(s)" })
      .nullable(),
  })
  .strict();
