import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import { randomUUID } from "crypto";
import { Recipient } from "../../services/email/models/Recipient";
import sendTemplateEmail from "../../services/email/sendMails";
import { templates } from "../../services/email/models/Template";
import { MFARequestType } from "../../models/enums/MFARequestType";
import { MFAMethod } from "../../models/enums/MFAMethod";
import { MFARequestStatus } from "../../models/enums/MFARequestStatus";
import { MFARequest } from "../../models/MFARequest";
import { hash } from "../../services/hashing/hash";
import { Consumer } from "../../models/Consumer";
import { randomSixDigitCode } from "../../utils/random";

const MFA_REQUEST_EXPIRATION_MINUTES = 15;

async function generateHashedLinkId(email: string): Promise<string> {
  const data = `${email}:${new Date().toISOString()}:${randomUUID()}`;
  return await hash(data);
}

const requestMFAHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const appClient = (req as any).appClient;

    const { userId, requestType} = req.body;

    const user = await Consumer.findById(userId);

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

    const requestConfig = {
      ["code"]: {
        verificationMode: "code",
        verificationCode: randomSixDigitCode(),
        verificationlinkId: undefined,
      },
      ["link"]: {
        verificationMode: "link",
        verificationCode: undefined,
        verificationlinkId: await generateHashedLinkId(user.email),
      },
    }[appClient.mfaSettings?.verificationMode as "code" | "link"];

    await MFARequest.create({
      userId: user.id,
      clientId: user.clientId,
      type: requestType,
      method: MFAMethod.EMAIL,
      status: MFARequestStatus.PENDING,
      verification: {
        type: requestConfig.verificationMode,
        code: requestConfig.verificationCode,
        linkId: requestConfig.verificationlinkId,
      },
      expiresAt: appClient.mfaSettings?.expirationTime
        ? new Date(Date.now() + appClient.mfaSettings.expirationTime * 60 * 1000)
        : new Date(Date.now() + MFA_REQUEST_EXPIRATION_MINUTES * 60 * 1000),
    });

    const emailConfig = {
      [MFARequestType.ACTIVATE]: {
        link: `${appClient.redirectUrl}/auth/MFA/activate?&r=${requestConfig.verificationlinkId ?? "" }`,
        codeTemplate: templates.activateMFA.id,
        linkTemplate: templates.mfaActivationRequest.id,
      },
      [MFARequestType.DEACTIVATE]: {
        link: `${appClient.redirectUrl}/auth/MFA/deactivate?&r=${requestConfig.verificationlinkId ?? ""}`,
        codeTemplate: templates.deactivateMFA.id,
        linkTemplate: templates.mfaDeactivationRequest.id,
      },
    }[requestType as MFARequestType];

    const emailVariable = appClient.mfaSettings?.verificationMode === "code" ? requestConfig.verificationCode : emailConfig.link;
    const templateId =
      appClient.mfaSettings?.verificationMode === "code"
        ? emailConfig.codeTemplate
        : emailConfig.linkTemplate;

    await sendTemplateEmail(templateId, {
      recipient,
      appClientBranding: {
        appName: appClient.branding.appName,
        primaryColor: appClient.branding.primaryColor,
        logoUrl: appClient.branding.logoUrl,
      },
      variable: emailVariable,
    });

    return res
      .status(200)
      .json({ message: "MFA request processed", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default requestMFAHandler;
