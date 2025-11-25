import e, { Request, Response, NextFunction } from "express";
import { Tenant } from "../../../models/Tenant";
import crypto from "crypto";
import { CustomError } from "../../../middleware/error/errorHandler";
import { hash } from "../../../services/hashing/hash";
import { generateTenantToken } from "../../../services/token/tokenService";

const config = require("config");
const scopes = config.get("tenant.scopes");

const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, confirmPassword, firstName, lastName, role } =
      req.body;

    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      const error = new Error("All fields are required") as CustomError;
      error.status = 400;
      error.code = "missingFields";
      throw error;
    }

    const tenant = await Tenant.findOne({ email });
    if (tenant) {
      const error = new Error("User already exists") as CustomError;
      error.status = 400;
      error.code = "userAlreadyExists";
      throw error;
    }

    if (password !== confirmPassword) {
      const error = new Error("Passwords do not match") as CustomError;
      error.status = 400;
      error.code = "passwordMismatch";
      throw error;
    }

    const hashedPassword = await hash(password);

    const secretKey = crypto.randomBytes(64).toString("hex");

    const tenantId = crypto.randomUUID();
    const newTenant = new Tenant({
      id: tenantId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      secretKey,
      role,
      scopes,
      isActive: true,
      isMFAActivated: true
    });

    await newTenant.save();

    const result = {
      email: email,
      firstName: firstName,
      lastName: lastName,
      secretKey: secretKey,
      role: role,
      scopes: scopes,
      tenantId: tenantId
    };

    const { access_token, refresh_token } = await generateTenantToken(
      { jwtPayload: result },
      newTenant.secretKey
    );

    res.status(201).json({
      message: "Tenant registered successfully",
      ...result,
      access_token,
      refresh_token,
      isSuccess: true,
    });
  } catch (error) {
    console.error("Error registering tenant:", error);
    next(error);
  }
};

export default registerHandler;
