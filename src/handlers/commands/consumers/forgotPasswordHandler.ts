import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { randomSixDigitCode } from "../../../utils/random";
import { Recipient } from "../../../services/email/models/Recipient";
import sendTemplateEmail from "../../../services/email/sendMails";
import { templates } from "../../../services/email/models/Template";
import { Consumer } from "../../../models/Consumer";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { hash } from "../../../services/hashing/hash";
import ms from "ms";


const forgotPasswordHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const appClient = (request as any).appClient;

    const { email } = request.body;

    if (!email) {
      const error = new Error("Missing required filds") as CustomError;
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

    const resetCode = randomSixDigitCode();
    const recipient: Recipient = {
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
    };

    await sendTemplateEmail(templates.forgotPassword.id, {
      recipient,
      appClientBranding: {
        appName: appClient.branding.appName,
        primaryColor: appClient.branding.primaryColor,
        logoUrl: appClient.branding.logoUrl,
      },
      variable: resetCode,
    });

    const expiresInMs = ms(appClient.resetTokenExpiresIn);

    const resetPasswordExpires = new Date(Date.now() + expiresInMs);
    const resetPasswordToken = await hash(resetCode);

    user.secondaryUserAccess = {
      code: resetPasswordToken,
      expires: resetPasswordExpires,
      type: SecondaryUserAccessMethodType.ForgotPassword,
    };
    user.save();
    response.status(201).json({
      message: "Reset code sent to your email",
      resetPasswordToken,
      isError: false,
    });
  } catch (error) {
    next(error);
  }
};

export default forgotPasswordHandler;
