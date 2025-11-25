import { NextFunction, Request, Response } from "express";
import AppClient from "../../../models/AppClient";
import { randomUUID } from "crypto";
import { templates } from "../../../services/email/models/Template";
import { Tenant } from "../../../models/Tenant";
import { CustomError } from "../../../middleware/error/errorHandler";

const createClientAppHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      tenantId,
      name,
      tokenExpiresIn,
      resetTokenExpiresIn,
      mfaVerificationMode,
      mfaExpiresIn,
      redirectUrl,
      supportEmail,
      logoUrl,
      primaryColor,
      logoutUrl,
      resetPasswordUrl,
    } = req.body;

    const tenant = await Tenant.findOne({id: tenantId});
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
      resetTokenExpiresIn,
      redirectUrl,
      resetPasswordUrl,
      logoutUrl,
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
      data: { appId: newAppClient.id },
    });
  } catch (error) {
    console.error("Error creating app client:", error);
    next(error);
  }
};

export default createClientAppHandler;
