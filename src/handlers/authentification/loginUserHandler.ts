import { NextFunction, Request, Response } from "express";
import User, { SecondaryUserAccessType } from "../../models/User";
import { CustomError } from "../../middleware/error/errorHandler";
import { comparePassword, hash } from "../../utils/hash";
import jwt, { Secret } from "jsonwebtoken";
import config from "config";
import { generateMFACode } from "../../utils/random";
import { sendMailAsync } from "../../services/email/sendMails";
import { Recipient } from "../../services/email/models/Recipient";
import { EmailTemplateType } from "../../services/email/models/Template";
import { generateUserToken } from "../../services/token/tokenService";

const loginUserHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {

    const appClient = (request as any).appClient;

    const { email, password } = request.body;
    if (!email || !password) {
      const error = new Error("Missing required filds") as CustomError;
      error.status = 400;
      throw error;
    }

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("Invalid email or password") as CustomError;
      error.status = 401;
      error.code = "invalidCredentials";
      throw error;
    }

    const isPasswordValid = await comparePassword(password, user.password);

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
    };

    const appId = (request as any).appClient.appId;
    const token = await generateUserToken({ jwtPayload: returnedUser }, appId);

    if (user.isMFAActivated) {
      const code = generateMFACode();

      const recipient: Recipient = {
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`,
      };

      await sendMailAsync(recipient, EmailTemplateType.LoginByCodeMFA, {
        appName: appClient.branding.appName,
        logoUrl: appClient.branding.logoUrl,
      }, code);


      user.secondaryUserAccess = {
        code: await hash(code),
        expires: new Date(Date.now() + 15 * 60 * 1000),
        type: SecondaryUserAccessType.MFA
      };

      await user.save();

      response.status(201).json({
        MFARequired: true,
        message:
          "MFA is required, Please check your email for the verification code.",
      });

      return;
    }

    response.status(200).json({
      token,
      user: returnedUser,
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default loginUserHandler;
