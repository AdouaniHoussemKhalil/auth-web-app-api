import { Request, Response, NextFunction } from "express";
import { Tenant } from "../../../models/Tenant";
import { CustomError } from "../../../middleware/error/errorHandler";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { generateTenantToken } from "../../../services/token/tokenService";
import { compare } from "../../../services/hashing/hash";

const loginByMFACodeHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { email, mfaCode } = request.body;

    if (!email || !mfaCode) {
      const error = new Error("Missing required fields") as CustomError;
      error.status = 400;
      throw error;
    }

    const tenant = await Tenant.findOne({ email });
    if (!tenant) {
      const error = new Error("User not found") as CustomError;
      error.status = 404;
      throw error;
    }

    const { code, expires, type } = tenant.secondaryUserAccess ?? {};

    if (
      !tenant.secondaryUserAccess ||
      !code ||
      !expires ||
      !type ||
      type !== SecondaryUserAccessMethodType.MFA
    ) {
      const error = new Error("An error occurred with mfa code") as CustomError;
      error.status = 400;
      error.code = "errorOcurredWithMfaCode";
      throw error;
    }

    if (!(expires instanceof Date)) {
      const error = new Error("invalid expiration date") as CustomError;
      error.status = 400;
      error.code = "invalidExpirationDate";
      throw error;
    }

    if (Date.now() > expires.getTime()) {
      tenant.secondaryUserAccess = undefined;
      await tenant.save();
      const error = new Error("Expired reset code") as CustomError;
      error.status = 400;
      error.code = "expiredResetCode";
      throw error;
    }

    
    if (!await compare(mfaCode, code)) {
      const error    = new Error("Invalid MFA code") as CustomError;
      error.status = 400;
      error.code = "invalidMfaCode";
      throw error;
    }

    tenant.secondaryUserAccess = undefined;
    await tenant.save();

    const result: any = {
      tenantId: tenant.id,
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      role: tenant.role,
      scopes: tenant.scopes
    };

    const {access_token, refresh_token} = await generateTenantToken({ jwtPayload: result }, tenant.secretKey);

    response.status(200).json({
      result,
      access_token,
      refresh_token,
      message: "MFA verified successfully",
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default loginByMFACodeHandler;
    