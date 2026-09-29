import { NextFunction, Request, Response } from "express";
import AppClient from "../../../models/AppClient";
import { randomUUID } from "crypto";
import ms from "ms";
import { templates } from "../../../services/email/models/Template";
import { Tenant } from "../../../models/Tenant";
import { CustomError } from "../../../middleware/error/errorHandler";
import { generateAppSecret } from "../../../utils/random";

const createClientAppHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      tenantId,
      name,
      tokenExpiresIn,
      refreshTokenExpiresIn,
      resetTokenExpiresIn,
      requireEmailVerification,
      mfaVerificationMode,
      mfaExpiresIn,
      redirectUrl,
      supportEmail,
      logoUrl,
      primaryColor,
      logoutUrl,
      resetPasswordUrl,
      googleClientId,
    } = req.body;

    const tenant = await Tenant.findOne({ id: tenantId });
    if (!tenant) {
      const error = new Error("Tenant not exist") as CustomError;
      error.status = 401;
      error.code = "tenantNotExist";
      throw error;
    }

    const newAppClient = await AppClient.create({
      id: randomUUID(),
      tenantId: tenantId,
      name,
      tokenExpiresIn,
      refreshTokenExpiresIn,
      resetTokenExpiresIn,
      requireEmailVerification,
      redirectUrl,
      resetPasswordUrl,
      logoutUrl,
      googleClientId,
      secretKey: generateAppSecret(),
      apiKey: randomUUID().toString(),
      mfaSettings: {
        verificationMode: mfaVerificationMode ?? "code",
        expiryMinutes: mfaExpiresIn ? Math.ceil(ms(mfaExpiresIn as ms.StringValue) / 60000) : 15,
      },
      isActive: true,
      branding: {
        appName: name,
        supportEmail: supportEmail,
        logoUrl: logoUrl,
        primaryColor: primaryColor,
        templates: [
          { id: templates.emailVerification.id, isActive: true },
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
      data: { appId: newAppClient.id },
    });
  } catch (error) {
    next(error);
  }
};

export default createClientAppHandler;
