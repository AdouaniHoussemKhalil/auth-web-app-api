import { NextFunction, Request, Response } from "express";
import { randomSixDigitCode, randomToken } from "../../../utils/random";
import { passwordResetLink } from "../../../services/email/links";
import { Recipient } from "../../../services/email/models/Recipient";
import sendTemplateEmail from "../../../services/email/sendMails";
import { emailBrandingOf } from "../../../services/email/branding";
import { templates } from "../../../services/email/models/Template";
import { Consumer } from "../../../models/Consumer";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { setOneTimeCode } from "../../../services/security/oneTimeCode";
import ms from "ms";

const forgotPasswordHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const appClient = (request as any).appClient;
    const { email } = request.body;

    const user = await Consumer.findOne({ email, clientId: appClient.id, isActive: true });

    // Même réponse que le compte existe ou non, pour ne pas révéler les e-mails inscrits.
    if (user) {
      const expiresInMs = ms((appClient.resetTokenExpiresIn || "15m") as ms.StringValue);
      // Mode lien : le jeton de réinitialisation part directement dans le lien vers la page de
      // l'application, qui l'envoie à /resetPassword. Mode code : code à échanger sur /verifyResetCode.
      const byLink = appClient.passwordResetMode === "link";
      const secret = byLink ? randomToken() : randomSixDigitCode();
      await setOneTimeCode(
        user,
        byLink
          ? SecondaryUserAccessMethodType.ResetPassword
          : SecondaryUserAccessMethodType.ForgotPassword,
        secret,
        expiresInMs
      );
      await user.save();

      const recipient: Recipient = {
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
      };

      await sendTemplateEmail(
        byLink ? templates.forgotPasswordLink.id : templates.forgotPassword.id,
        {
          recipient,
          branding: emailBrandingOf(appClient),
          variable: byLink
            ? passwordResetLink(appClient.resetPasswordUrl, user.email, secret)
            : secret,
          expiresInMs,
        }
      );
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
