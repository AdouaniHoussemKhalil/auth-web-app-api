import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import sendTemplateEmail from "../../../services/email/sendMails";
import { emailBrandingOf } from "../../../services/email/branding";
import { templates } from "../../../services/email/models/Template";
import { MFARequestType } from "../../../models/enums/MFARequestType";
import { verifyMFARequest } from "../../../services/mfa/mfaRequests";
import { MFARequestStatus } from "../../../models/enums/MFARequestStatus";
import { MFAMethod } from "../../../models/enums/MFAMethod";
import { IAppClient } from "../../../models/AppClient";
import { Consumer } from "../../../models/Consumer";

const activateMFAHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appClient: IAppClient = (req as any).appClient;

    const { userId, activationId } = req.body;

    if (!activationId) {
      const error = new Error("Activation ID is required") as CustomError;
      error.status = 400;
      throw error;
    }

    const user = await Consumer.findOne({ id: userId, clientId: appClient.id });

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

    const userMFARequest = await verifyMFARequest(
      appClient,
      userId,
      MFARequestType.ACTIVATE,
      activationId
    );

    user.isMFAActivated = true;
    user.usedMFAMethod = MFAMethod.EMAIL;
    user.usedMFAActivatedAt = new Date();

    userMFARequest.status = MFARequestStatus.COMPLETED;

    await userMFARequest.save();
    await user.save();

    if (
      appClient.branding?.templates.find((t) => t.id === templates.successfullyActivatedMFA.id)
        ?.isActive
    ) {
      await sendTemplateEmail(templates.successfullyActivatedMFA.id, {
        recipient: {
          email: user.email,
          fullName: `${user.firstName} ${user.lastName}`,
        },
        branding: emailBrandingOf(appClient),
      });
    }

    res.status(200).json({ message: "MFA activated successfully", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default activateMFAHandler;
