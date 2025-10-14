import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import User, { SecondaryUserAccessType } from "../../models/User";
import { comparePassword, hash } from "../../utils/hash";
import jwt, { Secret } from "jsonwebtoken";
import config from "config";
import { generateUserToken } from "../../services/token/tokenService";

const loginByCodeMFAHandler = async (
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

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User not found") as CustomError;
      error.status = 404;
      throw error;
    }

    const { code, expires, type } = user.secondaryUserAccess ?? {};

    if (
      !user.secondaryUserAccess ||
      !code ||
      !expires ||
      !type ||
      type !== SecondaryUserAccessType.MFA
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
      user.secondaryUserAccess = undefined;
      await user.save();
      const error = new Error("Expired reset code") as CustomError;
      error.status = 400;
      error.code = "expiredResetCode";
      throw error;
    }

    
    if (!await comparePassword(mfaCode, code)) {
      const error = new Error("Invalid MFA code") as CustomError;
      error.status = 400;
      error.code = "invalidMfaCode";
      throw error;
    }

    user.secondaryUserAccess = undefined;
    await user.save();

    const returnedUser: any = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };

    const appId = (request as any).appClient.appId;
    const token = await generateUserToken({ jwtPayload: returnedUser }, appId);

    response.status(200).json({
      returnedUser,
      token,
      message: "MFA verified successfully",
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default loginByCodeMFAHandler;
