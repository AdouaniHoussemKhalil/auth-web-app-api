import { OAuth2Client, TokenPayload } from "google-auth-library";
import { createError } from "../../middleware/error/errorHandler";

// Un seul client : l'audience (Client ID attendu) est passée à chaque vérification.
const client = new OAuth2Client();

export type GoogleIdentity = TokenPayload & { email: string };

const invalidGoogleToken = () =>
  createError(401, "invalidGoogleToken", "Invalid or expired Google ID token");

/**
 * Vérifie la signature, l'expiration et l'audience d'un ID token Google, puis exige une adresse vérifiée.
 * `audience` : Client ID OAuth pour lequel le token doit avoir été émis.
 */
export const verifyGoogleIdToken = async (
  token: string,
  audience: string
): Promise<GoogleIdentity> => {
  let payload: TokenPayload | undefined;
  try {
    const ticket = await client.verifyIdToken({ idToken: token, audience });
    payload = ticket.getPayload();
  } catch {
    throw invalidGoogleToken();
  }

  if (!payload?.email) throw invalidGoogleToken();
  if (!payload.email_verified) {
    throw createError(401, "googleEmailNotVerified", "Google account email is not verified");
  }
  return payload as GoogleIdentity;
};

// Certains comptes Google n'ont pas de nom de famille : prénom et nom sont obligatoires en base.
export const googleNames = ({ email, given_name, family_name }: GoogleIdentity) => ({
  firstName: given_name || email.split("@")[0],
  lastName: family_name || "-",
});
