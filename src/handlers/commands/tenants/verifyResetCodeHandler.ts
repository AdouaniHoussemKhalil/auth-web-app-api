import { NextFunction, Request, Response } from "express";
import { createError } from "../../../middleware/error/errorHandler";
import { Tenant } from "../../../models/Tenant";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { consumeOneTimeCode, setOneTimeCode } from "../../../services/security/oneTimeCode";
import { randomToken } from "../../../utils/random";

const RESET_TOKEN_EXPIRATION_MS = 15 * 60 * 1000;

// Échange le code reçu par e-mail contre un jeton à usage unique, exigé par /tenants/resetPassword.
const verifyResetCodeHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { email, resetCode } = request.body;

    const tenant = await Tenant.findOne({ email, isActive: true });
    if (!tenant) throw createError(400, "invalidCode", "Invalid code");

    await consumeOneTimeCode(tenant, SecondaryUserAccessMethodType.ForgotPassword, resetCode);

    const resetToken = randomToken();
    await setOneTimeCode(
      tenant,
      SecondaryUserAccessMethodType.ResetPassword,
      resetToken,
      RESET_TOKEN_EXPIRATION_MS
    );
    await tenant.save();

    response.status(201).json({ message: "validResetCode", resetToken, isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default verifyResetCodeHandler;
