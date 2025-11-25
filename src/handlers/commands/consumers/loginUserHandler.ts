import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { randomSixDigitCode } from "../../../utils/random";
import { generateConsumerToken } from "../../../services/token/tokenService";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { templates } from "../../../services/email/models/Template";
import { Recipient } from "../../../services/email/models/Recipient";
import sendTemplateEmail from "../../../services/email/sendMails";
import { Consumer } from "../../../models/Consumer";
import { compare, hash } from "../../../services/hashing/hash";

const loginUserHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = request.body;
    if (!email || !password) {
      const error = new Error("Missing required filds") as CustomError;
      error.status = 400;
      throw error;
    }

    const user = await Consumer.findOne({ email });
    if (!user) {
      const error = new Error("Invalid email or password") as CustomError;
      error.status = 401;
      error.code = "invalidCredentials";
      throw error;
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      const error = new Error("Invalid email or password") as CustomError;
      error.status = 401;
      error.code = "invalidCredentials";
      throw error;
    }

    const returnedUser: any = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      scopes: user.scopes,
    };

    const appClient = (request as any).appClient;
    const { access_token, refresh_token } = await generateConsumerToken(
      { jwtPayload: returnedUser },
      appClient.id
    );

    if (user.isMFAActivated) {
      const code = randomSixDigitCode();
      const expiresInMs = appClient.mfaSettings?.expiryMinutes * 60 * 1000;
      user.secondaryUserAccess = {
        code: await hash(code),
        expires: new Date(Date.now() + expiresInMs),
        type: SecondaryUserAccessMethodType.MFA,
      };

      const recipient: Recipient = {
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`,
      };

      await user.save();

      sendTemplateEmail(templates.loginByCodeMFA.id, {
        recipient,
        appClientBranding: {
          appName: appClient.branding.appName,
          primaryColor: appClient.branding.primaryColor,
          logoUrl: appClient.branding.logoUrl,
        },
        variable: code,
      }).catch(err => console.error("Email error: ", err));
      response.status(201).json({
        MFARequired: true,
        message:
          "MFA is required, Please check your email for the verification code.",
      });
    }

    response.status(200).json({
      access_token,
      refresh_token,
      user: returnedUser,
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default loginUserHandler;
