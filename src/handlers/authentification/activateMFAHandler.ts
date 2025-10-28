import { NextFunction, Request, Response } from "express";
import User, { MFAMethod } from "../../models/User";
import { CustomError } from "../../middleware/error/errorHandler";
import { MFARequestStatus, UserMFARequest } from "../../models/UserMFARequest";
import sendTemplateEmail from "../../services/email/sendMails";
import { templates } from "../../services/email/models/Template";
import { IAppClient } from "../../models/AppClient";

const activateMFAHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const appClient: IAppClient = (req as any).appClient;

    const { userId, activationId } = req.body;

    if (!activationId) {
      const error = new Error("Activation ID is required") as CustomError;
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

    const query: any = {
      userId,
      "verification.type": appClient.mfaSettings?.verificationMode,
    };

    if (appClient.mfaSettings?.verificationMode === "code") {
      query["verification.code"] = activationId;
    } else if (appClient.mfaSettings?.verificationMode === "link") {
      query["verification.link"] = activationId;
    }

    const userMFARequest = await UserMFARequest.findOne(query);

    if (!userMFARequest) {
      const error = new Error(
        "Invalid or expired activation ID"
      ) as CustomError;
      error.status = 400;
      throw error;
    }

    if (Date.now() > userMFARequest.expiresAt.getTime()) {
      userMFARequest.status = MFARequestStatus.EXPIRED;
      await userMFARequest.save();
      const error = new Error(
        "Invalid or expired activation ID"
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


    if (
      appClient.branding?.templates.find(t => t.id === templates.successfullyActivatedMFA.id)
        ?.isActive
    ) {
      await sendTemplateEmail(templates.successfullyActivatedMFA.id, {
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
      .json({ message: "MFA activated successfully", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default activateMFAHandler;
