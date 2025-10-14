import { NextFunction, Request, Response } from "express";
import User, { MFAMethod } from "../../models/User";
import { CustomError } from "../../middleware/error/errorHandler";
import { sendMailAsync } from "../../services/email/sendMails";
import { Recipient } from "../../services/email/models/Recipient";
import { EmailTemplateType } from "../../services/email/models/Template";
import { MFARequestStatus, UserMFARequest } from "../../models/UserMFARequest";

const activateMFAHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    const appClient = (req as any).appClient;

    const { userId, activationToken, sendSuccessMail = false } = req.body;

    if (!activationToken) {
      const error = new Error("Activation token is required") as CustomError;
      error.status = 400;
      throw error;
    }

    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("User not found") as CustomError;
      error.status = 404;
      throw error;
    }

    if (user.isMFAActivated) {
      const error = new Error("MFA is already activated") as CustomError;
      error.status = 400;
      throw error;
    }

    const userMFARequest = await UserMFARequest.findOne({
      userId,
      token: activationToken,
    });

    if (!userMFARequest) {
      const error = new Error(
        "Invalid or expired activation token"
      ) as CustomError;
      error.status = 400;
      throw error;
    }

    if (Date.now() > userMFARequest.expiresAt.getTime()) {
      userMFARequest.status = MFARequestStatus.EXPIRED;
      await userMFARequest.save();
      const error = new Error(
        "Invalid or expired activation token"
      ) as CustomError;
      error.status = 400;
      throw error;
    }

    user.isMFAActivated = true;
    user.usedMFAMethod = MFAMethod.EMAIL;
    user.usedMFAActivatedAt = new Date();

    userMFARequest.status = MFARequestStatus.COMPLETED;

    await userMFARequest.save();
    await user.save();

    if (sendSuccessMail) {
      const recipient: Recipient = {
        email: user.email,
        fullName: user.firstName,
      };

      await sendMailAsync(
        recipient,
        EmailTemplateType.SuccessfullyActivatedMFA,
        {
          appName: appClient.branding.appName,
          logoUrl: appClient.branding.logoUrl,
        }
      );
    }

    res
      .status(200)
      .json({ message: "MFA activated successfully", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default activateMFAHandler;
