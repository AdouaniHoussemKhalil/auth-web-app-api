import { NextFunction, Request, Response } from "express";
import User from "../../models/User";
import { CustomError } from "../../middleware/error/errorHandler";
import { EmailTemplateType } from "../../services/email/models/Template";
import { sendMailAsync } from "../../services/email/sendMails";
import { Recipient } from "../../services/email/models/Recipient";
import { MFARequestStatus, UserMFARequest } from "../../models/UserMFARequest";
const deactivateMFAHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const appClient = (req as any).appClient;
    const { userId, deactivationToken, sendSuccessMail = false } = req.body;

    if (!deactivationToken) {
      const error = new Error("Deactivation token is required") as CustomError;
      error.status = 400;
      throw error;
    }

    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("User not found") as CustomError;
      error.status = 404;
      throw error;
    }

    if (!user.isMFAActivated) {
      const error = new Error("MFA is already deactivated") as CustomError;
      error.status = 400;
      throw error;
    }

    const userMFARequest = await UserMFARequest.findOne({
      userId,
      token: deactivationToken,
    });

    if (!userMFARequest) {
      const error = new Error(
        "Invalid or expired deactivation token"
      ) as CustomError;
      error.status = 400;
      throw error;
    }

    if (Date.now() > userMFARequest.expiresAt.getTime()) {
      userMFARequest.status = MFARequestStatus.EXPIRED;
      await userMFARequest.save();
      const error = new Error(
        "Invalid or expired deactivation token"
      ) as CustomError;
      error.status = 400;
      throw error;
    }

    user.isMFAActivated = false;
    user.usedMFAMethod = undefined;
    user.usedMFAActivatedAt = undefined;

    userMFARequest.status = MFARequestStatus.COMPLETED;

    await userMFARequest.save();
    await user.save();

    if (sendSuccessMail) {
      const recipient: Recipient = {
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`,
      };
      await sendMailAsync(
        recipient,
        EmailTemplateType.SuccessfullyDeactivatedMFA,
        {
          appName: appClient.branding.appName,
          logoUrl: appClient.branding.logoUrl,
        }
      );
    }

    res
      .status(200)
      .json({ message: "MFA deactivated successfully", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default deactivateMFAHandler;
