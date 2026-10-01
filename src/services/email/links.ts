import config from "config";

// URL publique de l'API (liens de vérification d'e-mail). En local : http://localhost:<port>.
const publicUrl = (
  config.has("api.publicUrl") && config.get<string>("api.publicUrl")
    ? config.get<string>("api.publicUrl")
    : `http://localhost:${config.has("server.port") ? config.get<number>("server.port") : 8080}`
).replace(/\/+$/, "");

/** Lien de vérification d'e-mail : pointe vers l'API, qui redirige ensuite vers l'application. */
export const emailVerificationLink = (userId: string, token: string) => {
  const url = new URL(`${publicUrl}/consumers/auth/verify-email-link`);
  url.searchParams.set("u", userId);
  url.searchParams.set("t", token);
  return url.toString();
};

/** Lien de réinitialisation : page de l'application (`resetPasswordUrl`), qui appelle /resetPassword. */
export const passwordResetLink = (resetPasswordUrl: string, email: string, token: string) => {
  const url = new URL(resetPasswordUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url.toString();
};

/** Ajoute des paramètres à une URL de l'application en conservant les siens. */
export const withParams = (target: string, params: Record<string, string>) => {
  const url = new URL(target);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
};
