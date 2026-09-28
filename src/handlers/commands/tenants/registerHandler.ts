import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { Tenant } from "../../../models/Tenant";
import { UserRole } from "../../../models/enums/UserRole";
import { createError } from "../../../middleware/error/errorHandler";
import { hash } from "../../../services/hashing/hash";
import { sendEmailVerification } from "../../../services/email/sendEmailVerification";

const config = require("config");
const scopes = config.get("tenant.scopes");

// Inscription : aucun token tant que l'adresse e-mail n'est pas vérifiée (POST /tenants/verifyEmail).
const registerHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, confirmPassword, firstName, lastName } = req.body;

    if (await Tenant.exists({ email })) {
      throw createError(400, "userAlreadyExists", "User already exists");
    }

    if (password !== confirmPassword) {
      throw createError(400, "passwordMismatch", "Passwords do not match");
    }

    const tenant = await Tenant.create({
      id: crypto.randomUUID(),
      email,
      password: await hash(password),
      firstName,
      lastName,
      secretKey: crypto.randomBytes(64).toString("hex"),
      // Le rôle n'est jamais choisi par le client.
      role: UserRole.TENANT,
      scopes,
      isActive: true,
      isMFAActivated: true,
      isEmailVerified: false,
    });

    await sendEmailVerification(tenant);

    res.status(201).json({
      message: "Tenant registered, please verify your email",
      tenantId: tenant.id,
      email: tenant.email,
      emailVerificationRequired: true,
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default registerHandler;
