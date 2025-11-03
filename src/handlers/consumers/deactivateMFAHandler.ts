import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import sendTemplateEmail from "../../services/email/sendMails";
import { templates } from "../../services/email/models/Template";
import { MFARequest } from "../../models/MFARequest";
import { MFARequestStatus } from "../../models/enums/MFARequestStatus";
import { IAppClient } from "../../models/AppClient";
import { Consumer } from "../../models/Consumer";

const deactivateMFAHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const appClient: IAppClient = (req as any).appClient;
    const { userId, deactivationId } = req.body;

    if (!deactivationId) {
      const error = new Error("Deactivation ID is required") as CustomError;
      error.status = 400;
      throw error;
    }

    const user = await Consumer.findById(userId);

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
    

    const userMFARequest = await MFARequest.findOne({
      userId,
      verification: {
        type: appClient.mfaSettings?.verificationMode,
        code: appClient.mfaSettings?.verificationMode === "code" ? deactivationId : undefined,
        link: appClient.mfaSettings?.verificationMode === "link" ? deactivationId : undefined,
      },
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


    if (
      appClient.branding?.templates.find(t => t.id === templates.successfullyDeactivatedMFA.id)
        ?.isActive
    ) {
      await sendTemplateEmail(templates.successfullyDeactivatedMFA.id, {
        recipient: {
          email: user.email,
          fullName: `${user.firstName} ${user.lastName}`,
        },
        appClientBranding: {
          appName: appClient.branding.appName,
          primaryColor: appClient.branding.primaryColor,
          logoUrl: appClient.branding.logoUrl,
        },
      });
    }

    res
      .status(200)
      .json({ message: "MFA deactivated successfully", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default deactivateMFAHandler;
