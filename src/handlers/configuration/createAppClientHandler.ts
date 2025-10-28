import { NextFunction, Request, Response } from "express";
import AppClient from "../../models/AppClient";
import { randomUUID } from "crypto";
import { templates } from "../../services/email/models/Template";

const createAppClientHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      tokenExpiresIn,
      mfaVerificationMode,
      mfaExpiresIn,
      redirectUrl,
      supportEmail,
      logoUrl,
      primaryColor,
    } = req.body;

    const newAppClient = await AppClient.create({
      name,
      tokenExpiresIn,
      redirectUrl,
      appId: randomUUID().toString(),
      secretKey: randomUUID().toString(),
      apiKey: randomUUID().toString(),
      mfaSettings: {
        verification: {
          type: mfaVerificationMode,
          expiresIn: mfaExpiresIn,
        },
      },
      isActive: true,
      branding: {
        appName: name,
        supportEmail: supportEmail,
        logoUrl: logoUrl,
        primaryColor: primaryColor,
        templates: [
          { id: templates.forgotPassword.id, isActive: true },
          { id: templates.loginByCodeMFA.id, isActive: true },
          { id: templates.activateMFA.id, isActive: true },
          { id: templates.deactivateMFA.id, isActive: true },
          { id: templates.successfullyActivatedMFA.id, isActive: true },
          { id: templates.successfullyDeactivatedMFA.id, isActive: true },
          { id: templates.mfaActivationRequest.id, isActive: true },
          { id: templates.mfaDeactivationRequest.id, isActive: true },
        ],
      },
    });

    return res.status(201).json({
      isSuccess: true,
      data: { appId: newAppClient.appId },
    });
  } catch (error) {
    next(error);
  }
};

export default createAppClientHandler;
