import { NextFunction, Request, Response } from "express";
import { comparePassword } from "../../utils/hash";
import { CustomError } from "../../middleware/error/errorHandler";
import User from "../../models/User";
import jwt, { Secret } from "jsonwebtoken";
import config from "config";

const verifyResetCodeHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { email, resetCode } = request.body;

    if (!email || !resetCode) {
      const error = new Error("An error occurred") as CustomError;
      error.status = 400;
      throw error;
    }

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User not exist") as CustomError;
      error.status = 401;
      error.code = "userNotExist";
      throw error;
    }

    if (!user.secondaryUserAccess || !user.secondaryUserAccess.expires) {
      const error = new Error(
        "An error occurred with reset code"
      ) as CustomError;
      error.status = 400;
      error.code = "errorOcurredWithResetCode";
      throw error;
    }

    const { code, expires } = user.secondaryUserAccess;

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

    const isResetCodeValid = await comparePassword(
      resetCode,
      code ?? ""
    );
    if (!isResetCodeValid) {
      const error = new Error("Invalid reset code") as CustomError;
      error.status = 400;
      error.code = "invalidResetCode";
      throw error;
    }

    const secret_token: Secret = config.get(
      "authentification.SECRET_RESET_PASSWORD_TOKEN"
    );

    const resetToken = jwt.sign({ jwtPayload: resetCode }, secret_token, {
      expiresIn: "10m",
    });

    user.secondaryUserAccess = undefined;
    await user.save();

    return response.status(201).json({
      message: "validResetCode",
      isSuccess: true,
      userId: user.id,
      resetLink: `${config.get("front.url")}/reset-password/${resetToken}`,
    });
  } catch (error) {
    next(error);
  }
};

export default verifyResetCodeHandler;
