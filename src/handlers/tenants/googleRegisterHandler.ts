import { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import { Tenant } from "../../models/Tenant";
import crypto from "crypto";
import { UserRole } from "../../models/enums/UserRole";
import { generateTenantToken } from "../../services/token/tokenService";

const config = require("config");
const googleConfig = config.get("google");

const scopes = config.get("tenant.scopes");

const client = new OAuth2Client(googleConfig.clientId);

export const googleRegister = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: googleConfig.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(400).json({ message: "Invalid token" });

    const { email, given_name, family_name } = payload;

    let tenant = await Tenant.findOne({ email });

    if (!tenant) {
      const secretKey = crypto.randomBytes(64).toString("hex");

      tenant = new Tenant({
        tenantId: crypto.randomUUID(),
        email,
        firstName: given_name,
        lastName: family_name,
        secretKey,
        isActive: true,
        isMFAActivated: false,
        role: UserRole.TENANT,
        scopes
      });

      await tenant.save();
    }

    const result = {
      email,
      firstName: given_name,
      lastName: family_name,
      role: tenant.role,
      scopes: scopes,
    };

    const { access_token, refresh_token } = await generateTenantToken(
      { jwtPayload: { result } },
      tenant.secretKey
    );

    res.json({
      message: "Google register/login successful",
      access_token,
      refresh_token,
      user: {
        email: tenant.email,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
      },
    });
  } catch (err) {
    console.error("Google register error:", err);
    next(err);
  }
};
