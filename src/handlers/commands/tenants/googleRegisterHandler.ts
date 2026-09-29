import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { createError } from "../../../middleware/error/errorHandler";
import { Tenant } from "../../../models/Tenant";
import { UserRole } from "../../../models/enums/UserRole";
import { generateTenantToken } from "../../../services/token/tokenService";
import { tenantTokenPayload } from "../../../services/token/payloads";
import { googleNames, verifyGoogleIdToken } from "../../../services/google/verifyGoogleIdToken";

const config = require("config");
const googleConfig = config.get("google");

const scopes = config.get("tenant.scopes");

export const googleRegister = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const identity = await verifyGoogleIdToken(req.body.token, googleConfig.clientId);
    const { email } = identity;

    let tenant = await Tenant.findOne({ email });

    if (!tenant) {
      tenant = await Tenant.create({
        id: crypto.randomUUID(),
        email,
        ...googleNames(identity),
        secretKey: crypto.randomBytes(64).toString("hex"),
        isActive: true,
        isByGoogle: true,
        // Google a déjà vérifié l'adresse (email_verified).
        isEmailVerified: true,
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
