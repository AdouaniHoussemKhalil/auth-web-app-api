import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { Consumer } from "../../../models/Consumer";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { consumeOneTimeCode, setOneTimeCode } from "../../../services/security/oneTimeCode";
import { randomToken } from "../../../utils/random";

const RESET_TOKEN_EXPIRATION_MS = 15 * 60 * 1000;

const verifyResetCodeHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { email, resetCode } = request.body;

    const user = await Consumer.findOne({ email, clientId: (request as any).appClient.id });
    if (!user) {
      const error = new Error("Invalid code") as CustomError;
      error.status = 400;
      error.code = "invalidCode";
      throw error;
    }

    await consumeOneTimeCode(user, SecondaryUserAccessMethodType.ForgotPassword, resetCode);

    // Le code e-mail est échangé contre un jeton à usage unique exigé par /resetPassword.
    const resetToken = randomToken();
    await setOneTimeCode(
      user,
      SecondaryUserAccessMethodType.ResetPassword,
      resetToken,
      RESET_TOKEN_EXPIRATION_MS
    );
    await user.save();

    return response.status(201).json({
      message: "validResetCode",
      isSuccess: true,
      resetToken,
    });
  } catch (error) {
    next(error);
  }
};

export default verifyResetCodeHandler;
