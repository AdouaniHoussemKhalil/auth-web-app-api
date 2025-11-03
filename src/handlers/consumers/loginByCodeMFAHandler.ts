import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import { generateConsumerToken } from "../../services/token/tokenService";
import { SecondaryUserAccessMethodType } from "../../models/subdocuments/SecondaryAccessMethod";
import { Consumer } from "../../models/Consumer";
import { compare } from "../../services/hashing/hash";

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

    const user = await Consumer.findOne({ email });
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
      user.secondaryUserAccess = undefined;
      await user.save();
      const error = new Error("Expired reset code") as CustomError;
      error.status = 400;
      error.code = "expiredResetCode";
      throw error;
    }

    
    if (!await compare(mfaCode, code)) {
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
      scopes: user.scopes
    };

    const appId = (request as any).appClient.id;
    const {access_token, refresh_token} = await generateConsumerToken({ jwtPayload: returnedUser }, appId);

    response.status(200).json({
      returnedUser,
      access_token,
      refresh_token,
      message: "MFA verified successfully",
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default loginByCodeMFAHandler;
