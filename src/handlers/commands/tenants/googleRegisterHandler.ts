import { Request, Response, NextFunction } from "express";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import crypto from "crypto";
import { createError } from "../../../middleware/error/errorHandler";
import { Tenant } from "../../../models/Tenant";
import { UserRole } from "../../../models/enums/UserRole";
import { generateTenantToken } from "../../../services/token/tokenService";
import { tenantTokenPayload } from "../../../services/token/payloads";

const config = require("config");
const googleConfig = config.get("google");

const scopes = config.get("tenant.scopes");

const client = new OAuth2Client(googleConfig.clientId);

const invalidGoogleToken = () =>
  createError(401, "invalidGoogleToken", "Invalid or expired Google ID token");

// Vérifie la signature, l'expiration et l'audience (google.clientId) de l'ID token.
const verifyGoogleIdToken = async (token: string): Promise<TokenPayload & { email: string }> => {
  let payload: TokenPayload | undefined;
  try {
    const ticket = await client.verifyIdToken({ idToken: token, audience: googleConfig.clientId });
    payload = ticket.getPayload();
  } catch {
    throw invalidGoogleToken();
  }

  if (!payload?.email) throw invalidGoogleToken();
  if (!payload.email_verified) {
    throw createError(401, "googleEmailNotVerified", "Google account email is not verified");
  }
  return payload as TokenPayload & { email: string };
};

export const googleRegister = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, given_name, family_name } = await verifyGoogleIdToken(req.body.token);

    let tenant = await Tenant.findOne({ email });

    if (!tenant) {
      tenant = await Tenant.create({
        id: crypto.randomUUID(),
        email,
        // Certains comptes Google n'ont pas de nom de famille : les deux champs sont obligatoires.
        firstName: given_name || email.split("@")[0],
        lastName: family_name || "-",
        secretKey: crypto.randomBytes(64).toString("hex"),
        isActive: true,
        isByGoogle: true,
        isMFAActivated: false,
        role: UserRole.TENANT,
        scopes,
      });
    }

    if (!tenant.isActive) {
      throw createError(403, "UserBlocked", "User is blocked");
    }

    const payload = tenantTokenPayload(tenant);
    const { access_token, refresh_token } = await generateTenantToken(
      { jwtPayload: payload },
      tenant.secretKey,
      tenant.id
    );

    res.status(200).json({
      message: "Google register/login successful",
      access_token,
      refresh_token,
      user: payload,
      isSuccess: true,
    });
  } catch (err) {
    next(err);
  }
};
