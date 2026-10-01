import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { Recipient } from "../../../services/email/models/Recipient";
import sendTemplateEmail from "../../../services/email/sendMails";
import { emailBrandingOf } from "../../../services/email/branding";
import { templates } from "../../../services/email/models/Template";
import { MFARequestType } from "../../../models/enums/MFARequestType";
import { MFAMethod } from "../../../models/enums/MFAMethod";
import { MFARequestStatus } from "../../../models/enums/MFARequestStatus";
import { MFARequest } from "../../../models/MFARequest";
import { Consumer } from "../../../models/Consumer";
import { randomSixDigitCode, randomToken } from "../../../utils/random";
import { hash } from "../../../services/hashing/hash";
import { sha256 } from "../../../services/security/oneTimeCode";
import { expirePendingMFARequests } from "../../../services/mfa/mfaRequests";

const MFA_REQUEST_EXPIRATION_MINUTES = 15;

const requestMFAHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appClient = (req as any).appClient;

    const { requestType, email } = req.body;

    const user = await Consumer.findOne({ email, clientId: appClient.id });

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
      const error = new Error("MFA is not activated") as CustomError;
      error.status = 400;
      throw error;
    }

    const recipient: Recipient = {
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`,
    };

    const verificationMode = appClient.mfaSettings?.verificationMode === "link" ? "link" : "code";
    const verificationCode = verificationMode === "code" ? randomSixDigitCode() : undefined;
    const verificationLinkId = verificationMode === "link" ? randomToken() : undefined;
    const expiryMinutes = appClient.mfaSettings?.expiryMinutes ?? MFA_REQUEST_EXPIRATION_MINUTES;

    await expirePendingMFARequests(user.clientId, user.id, requestType);

    // Seuls les hachés sont stockés : le code ou le lien en clair ne part que par e-mail.
    await MFARequest.create({
      userId: user.id,
      clientId: user.clientId,
      type: requestType,
      method: MFAMethod.EMAIL,
      status: MFARequestStatus.PENDING,
      verification: {
        type: verificationMode,
        code: verificationCode && (await hash(verificationCode)),
        linkId: verificationLinkId && sha256(verificationLinkId),
      },
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    });

    const emailConfig = {
      [MFARequestType.ACTIVATE]: {
        link: `${appClient.redirectUrl}/auth/MFA/activate?r=${verificationLinkId}`,
        codeTemplate: templates.activateMFA.id,
        linkTemplate: templates.mfaActivationRequest.id,
      },
      [MFARequestType.DEACTIVATE]: {
        link: `${appClient.redirectUrl}/auth/MFA/deactivate?r=${verificationLinkId}`,
        codeTemplate: templates.deactivateMFA.id,
        linkTemplate: templates.mfaDeactivationRequest.id,
      },
    }[requestType as MFARequestType];

    const emailVariable = verificationMode === "code" ? verificationCode : emailConfig.link;
    const templateId =
      verificationMode === "code" ? emailConfig.codeTemplate : emailConfig.linkTemplate;

    await sendTemplateEmail(templateId, {
      recipient,
      branding: emailBrandingOf(appClient),
      variable: emailVariable,
      expiresInMs: expiryMinutes * 60 * 1000,
    });

    return res.status(200).json({ message: "MFA request processed", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default requestMFAHandler;
