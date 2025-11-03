import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import { Consumer } from "../../models/Consumer";
import { compare } from "../../services/hashing/hash";


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

    const user = await Consumer.findOne({ email });
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

    const isResetCodeValid = await compare(
      resetCode,
      code ?? ""
    );
    if (!isResetCodeValid) {
      const error = new Error("Invalid reset code") as CustomError;
      error.status = 400;
      error.code = "invalidResetCode";
      throw error;
    }

    user.secondaryUserAccess = undefined;
    await user.save();

    return response.status(201).json({
      message: "validResetCode",
      isSuccess: true,
      userId: user.id
    });
  } catch (error) {
    next(error);
  }
};

export default verifyResetCodeHandler;
