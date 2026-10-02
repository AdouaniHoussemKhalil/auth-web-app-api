import { NextFunction, Request, Response } from "express";
import { createError } from "../../../middleware/error/errorHandler";
import { Tenant } from "../../../models/Tenant";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { hash } from "../../../services/hashing/hash";
import { sendPasswordChangedAlert } from "../../../services/email/sendPasswordChangedAlert";
import { consumeOneTimeCode } from "../../../services/security/oneTimeCode";
import { revokeAllRefreshTokens } from "../../../services/token/tokenService";

const resetPasswordHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { email, resetToken, password, confirmPassword } = request.body;

    if (password !== confirmPassword) {
      throw createError(400, "passwordsDoNotMatch", "Passwords do not match");
    }

    const tenant = await Tenant.findOne({ email, isActive: true });
    if (!tenant) throw createError(400, "invalidCode", "Invalid code");

    await consumeOneTimeCode(tenant, SecondaryUserAccessMethodType.ResetPassword, resetToken);

    tenant.password = await hash(password);
    await tenant.save();

    // Le mot de passe a pu fuiter : toutes les sessions existantes sont fermées.
    await revokeAllRefreshTokens("tenant", tenant.id);
    await sendPasswordChangedAlert(tenant);

    response.status(201).json({ message: "Password has been reset", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default resetPasswordHandler;
