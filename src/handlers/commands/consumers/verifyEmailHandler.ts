import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { Consumer } from "../../../models/Consumer";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { consumeOneTimeCode } from "../../../services/security/oneTimeCode";

const verifyEmailHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { email, code } = request.body;

    const user = await Consumer.findOne({ email, clientId: (request as any).appClient.id });
    if (!user) {
      const error = new Error("Invalid code") as CustomError;
      error.status = 400;
      error.code = "invalidCode";
      throw error;
    }

    if (!user.isEmailVerified) {
      await consumeOneTimeCode(user, SecondaryUserAccessMethodType.EmailVerification, code);
      user.isEmailVerified = true;
      await user.save();
    }

    response.status(200).json({ message: "Email verified", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default verifyEmailHandler;
