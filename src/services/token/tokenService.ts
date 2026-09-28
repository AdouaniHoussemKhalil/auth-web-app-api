import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import AppClient from "../../models/AppClient";
import { Tenant } from "../../models/Tenant";
import { RefreshToken, TokenSubjectType } from "../../models/RefreshToken";

const config = require("config");
const AUDIENCE = config.get("aud");

export type TokenPair = { access_token: string; refresh_token: string };

const deriveSecret = (secretKey: string, type: "access" | "refresh") =>
  crypto
    .createHash("sha256")
    .update(secretKey + (type === "access" ? "_access" : "_refresh"))
    .digest("hex");

// Signe une paire de tokens et enregistre le refresh token pour pouvoir le faire tourner ou le révoquer.
const issueTokenPair = async (options: {
  payload: object;
  secretKey: string;
  audience: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
  subjectType: TokenSubjectType;
  subjectId: string;
  clientId?: string;
}): Promise<TokenPair> => {
  const jti = crypto.randomUUID();

  // sid : session (refresh token) à laquelle l'access token est rattaché, pour pouvoir le révoquer.
  const access_token = jwt.sign(
    { ...options.payload, type: "access", sid: jti },
    deriveSecret(options.secretKey, "access"),
    {
      expiresIn: options.accessExpiresIn as SignOptions["expiresIn"],
      audience: options.audience,
    }
  );

  const refresh_token = jwt.sign(
    { ...options.payload, type: "refresh" },
    deriveSecret(options.secretKey, "refresh"),
    {
      expiresIn: options.refreshExpiresIn as SignOptions["expiresIn"],
      audience: options.audience,
      jwtid: jti,
    }
  );

  const { exp } = jwt.decode(refresh_token) as { exp: number };
  await RefreshToken.create({
    jti,
    subjectType: options.subjectType,
    subjectId: options.subjectId,
    clientId: options.clientId,
    expiresAt: new Date(exp * 1000),
  });

  return { access_token, refresh_token };
};

/**
 * Un access token n'est valable que tant que sa session (le refresh token émis avec lui) n'est pas révoquée :
 * déconnexion, réinitialisation du mot de passe, rotation ou détection de rejeu l'invalident immédiatement.
 * Les access tokens émis avant l'ajout de `sid` sont refusés (reconnexion nécessaire).
 */
const assertSessionActive = async (decoded: { sid?: string }) => {
  const active =
    decoded.sid && (await RefreshToken.exists({ jti: decoded.sid, revokedAt: { $exists: false } }));
  if (!active) throw new Error("Session has been revoked");
};

export const generateConsumerToken = async (
  payload: object,
  appId: string,
  consumerId: string
): Promise<TokenPair> => {
  const appClient = await AppClient.findOne({ id: appId, isActive: true });
  if (!appClient) throw new Error("Invalid or inactive App Client");

  return issueTokenPair({
    payload: { ...payload, appId },
    secretKey: appClient.secretKey,
    audience: appClient.name,
    accessExpiresIn: appClient.tokenExpiresIn || "1h",
    refreshExpiresIn: appClient.refreshTokenExpiresIn || "7d",
    subjectType: "consumer",
    subjectId: consumerId,
    clientId: appClient.id,
  });
};

export const generateTenantToken = async (
  payload: object,
  secretKey: string,
  tenantId: string
): Promise<TokenPair> =>
  issueTokenPair({
    payload,
    secretKey,
    audience: AUDIENCE,
    accessExpiresIn: "1h",
    refreshExpiresIn: "7d",
    subjectType: "tenant",
    subjectId: tenantId,
  });

export const verifyConsumerToken = async (
  token: string,
  appId: string,
  type: "access" | "refresh" = "access"
): Promise<any> => {
  const appClient = await AppClient.findOne({ id: appId, isActive: true });
  if (!appClient) throw new Error("Invalid App Client for token verification");

  let decoded: any;
  try {
    decoded = jwt.verify(token, deriveSecret(appClient.secretKey, type), {
      audience: appClient.name,
    });
  } catch (err) {
    throw new Error("Invalid or expired user token", { cause: err });
  }

  if (type === "access") await assertSessionActive(decoded);
  return decoded;
};

export const verifyTenantToken = async (
  token: string,
  tenantId: string,
  type: "access" | "refresh" = "access"
): Promise<any> => {
  const tenant = await Tenant.findOne({ id: tenantId, isActive: true });
  if (!tenant) throw new Error("Invalid or inactive tenant");

  let decoded: any;
  try {
    decoded = jwt.verify(token, deriveSecret(tenant.secretKey, type), { audience: AUDIENCE });
  } catch (err: any) {
    if (err.name === "TokenExpiredError") throw new Error("Token expired", { cause: err });
    throw new Error("Invalid token", { cause: err });
  }

  if (type === "access") await assertSessionActive(decoded);
  return decoded;
};

/**
 * Marque un refresh token comme utilisé. Si le token avait déjà été révoqué, il a été rejoué
 * (vol probable) : tous les refresh tokens du même sujet sont alors révoqués.
 * Retourne false si le token est inconnu, déjà utilisé ou révoqué.
 */
export const consumeRefreshToken = async (jti: string): Promise<boolean> => {
  const stored = await RefreshToken.findOne({ jti });
  if (!stored) return false;

  if (stored.revokedAt) {
    await revokeAllRefreshTokens(stored.subjectType, stored.subjectId, stored.clientId);
    return false;
  }

  const updated = await RefreshToken.updateOne(
    { jti, revokedAt: { $exists: false } },
    { revokedAt: new Date() }
  );
  return updated.modifiedCount === 1;
};

export const revokeRefreshToken = (jti: string) =>
  RefreshToken.updateOne({ jti, revokedAt: { $exists: false } }, { revokedAt: new Date() });

export const revokeAllRefreshTokens = (
  subjectType: TokenSubjectType,
  subjectId?: string,
  clientId?: string
) =>
  RefreshToken.updateMany(
    {
      subjectType,
      ...(subjectId && { subjectId }),
      ...(clientId && { clientId }),
      revokedAt: { $exists: false },
    },
    { revokedAt: new Date() }
  );
