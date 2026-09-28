import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { Consumer } from "../../../models/Consumer";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { hash } from "../../../services/hashing/hash";
import { consumeOneTimeCode } from "../../../services/security/oneTimeCode";
import { revokeAllRefreshTokens } from "../../../services/token/tokenService";

const resetPasswordHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { email, resetToken, password, confirmPassword } = request.body;

    if (password !== confirmPassword) {
      const error = new Error("Passwords do not match") as CustomError;
      error.status = 400;
      error.code = "passwordsDoNotMatch";
      throw error;
    }

    const user = await Consumer.findOne({ email, clientId: (request as any).appClient.id });
    if (!user) {
      const error = new Error("Invalid code") as CustomError;
      error.status = 400;
      error.code = "invalidCode";
      throw error;
    }

    // Jeton délivré par /verifyResetCode : sans lui, impossible de changer le mot de passe.
    await consumeOneTimeCode(user, SecondaryUserAccessMethodType.ResetPassword, resetToken);

    user.password = await hash(password);
    await user.save();

    // Le mot de passe a pu fuiter : toutes les sessions existantes sont fermées.
    await revokeAllRefreshTokens("consumer", user.id, user.clientId);

    return response.status(201).json({
      message: "update password successfuly",
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default resetPasswordHandler;
