import { NextFunction, Request, Response } from "express";
import User, { MFAMethod } from "../../models/User";
import { CustomError } from "../../middleware/error/errorHandler";
import config from "config";
import { randomUUID } from "crypto";
import { hash } from "../../utils/hash";
import { sendMailAsync } from "../../services/email/sendMails";
import { Recipient } from "../../services/email/models/Recipient";
import { EmailTemplateType } from "../../services/email/models/Template";
import {
  MFARequestStatus,
  MFARequestType,
  UserMFARequest,
} from "../../models/UserMFARequest";

const MFARequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const appClient = (req as any).appClient;

    const { userId, requestType } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("User not found") as CustomError;
      error.status = 404;
      throw error;
    }

    if (requestType === MFARequestType.ACTIVATE && user.isMFAActivated) {
      const error = new Error("MFA is already activated") as CustomError;
      error.status = 400;
      throw error;
    }

    if (requestType === MFARequestType.DEACTIVATE && !user.isMFAActivated) {
      const error = new Error("MFA is not deactivated") as CustomError;
      error.status = 400;
      throw error;
    }

    const recipient: Recipient = {
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`,
    };

    const token = await generateRequestToken(recipient.email);

    const baseLinkUrl = (req as any).appClient.redirectUrl;

    if (requestType === MFARequestType.ACTIVATE) {
      const activationLink = `${baseLinkUrl}/auth/MFA/activate?id=2025&token=${token}`;

      await UserMFARequest.create({
        userId: user.id,
        clientId: user.clientId,
        type: MFARequestType.ACTIVATE,
        method: MFAMethod.EMAIL,
        status: MFARequestStatus.PENDING,
        token,
        link: activationLink,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      await sendMailAsync(
        recipient,
        EmailTemplateType.MFAActivationRequest,
        {
          appName: appClient.branding.appName,
          logoUrl: appClient.branding.logoUrl,
        },
        activationLink
      );
    } else if (requestType === MFARequestType.DEACTIVATE) {
      const deactivationLink = `${baseLinkUrl}/auth/MFA/deactivate?userId=${userId}&token=${token}`;
      await UserMFARequest.create({
        userId: user.id,
        clientId: user.clientId,
        type: MFARequestType.DEACTIVATE,
        method: MFAMethod.EMAIL,
        status: MFARequestStatus.PENDING,
        token,
        link: deactivationLink,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      await sendMailAsync(
        recipient,
        EmailTemplateType.MFADeactivationRequest,
        {
          appName: appClient.branding.appName,
          logoUrl: appClient.branding.logoUrl,
        },
        deactivationLink
      );
    }

    return res
      .status(200)
      .json({ message: "MFA request processed", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default MFARequestHandler;

const generateRequestToken = async (email: string): Promise<string> => {
  const base = `${new Date().toISOString()}:${randomUUID()}:${email}`;
  return await hash(base);
};
