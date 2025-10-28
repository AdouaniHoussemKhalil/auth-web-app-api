import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import User, { SecondaryUserAccessType } from "../../models/User";
import { generateResetCode } from "../../utils/random";
import { Recipient } from "../../services/email/models/Recipient";
import { hash } from "../../utils/hash";
import sendTemplateEmail from "../../services/email/sendMails";
import { templates } from "../../services/email/models/Template";

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

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User not exist") as CustomError;
      error.status = 401;
      error.code = "userNotExist";
      throw error;
    }

    const resetCode = generateResetCode();
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

    const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    const resetPasswordToken = await hash(resetCode);

    user.secondaryUserAccess = {
      code: resetPasswordToken,
      expires: resetPasswordExpires,
      type: SecondaryUserAccessType.ForgotPassword,
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
