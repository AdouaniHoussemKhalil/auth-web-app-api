import { NextFunction, Request, Response } from "express";
import { Tenant } from "../../../models/Tenant";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { templates } from "../../../services/email/models/Template";
import sendTemplateEmail from "../../../services/email/sendMails";
import { setOneTimeCode } from "../../../services/security/oneTimeCode";
import { randomSixDigitCode } from "../../../utils/random";

const RESET_CODE_EXPIRATION_MS = 15 * 60 * 1000;

const forgotPasswordHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const tenant = await Tenant.findOne({ email: request.body.email, isActive: true });

    // Même réponse que le compte existe ou non. Un compte Google peut ainsi définir un mot de passe.
    if (tenant) {
      const resetCode = randomSixDigitCode();
      await setOneTimeCode(
        tenant,
        SecondaryUserAccessMethodType.ForgotPassword,
        resetCode,
        RESET_CODE_EXPIRATION_MS
      );
      await tenant.save();

      await sendTemplateEmail(templates.forgotPassword.id, {
        recipient: { email: tenant.email, fullName: `${tenant.firstName} ${tenant.lastName}` },
        variable: resetCode,
      });
    }

    response.status(201).json({
      message: "If an account exists for this email, a reset code has been sent",
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default forgotPasswordHandler;
