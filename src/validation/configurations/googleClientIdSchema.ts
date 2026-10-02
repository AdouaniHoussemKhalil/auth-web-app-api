import { z } from "zod";

// Client ID OAuth Google d'une application web : "<projet>-<id>.apps.googleusercontent.com".
export const googleClientIdSchema = z.string().regex(/^[\w-]+\.apps\.googleusercontent\.com$/, {
  message: "googleClientId must be a Google OAuth client ID (*.apps.googleusercontent.com)",
});
