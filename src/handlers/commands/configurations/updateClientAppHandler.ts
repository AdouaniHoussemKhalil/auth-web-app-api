import { Request, Response, NextFunction } from "express";
import { Tenant } from "../../../models/Tenant";
import { createError, CustomError } from "../../../middleware/error/errorHandler";
import AppClient from "../../../models/AppClient";

const updateClientAppHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, appId } = req.params;

    const tenant = await Tenant.findOne({ id: tenantId });

    if (!tenant) {
      const error = new Error("Tenant not exist") as CustomError;
      error.status = 401;
      error.code = "tenantNotExist";
      throw error;
    }

    const app = await AppClient.findOne({ id: appId });

    if (!app || app.tenantId !== tenantId) {
      const error = new Error("App client not exist") as CustomError;
      error.status = 401;
      error.code = "appClientNotExist";
      throw error;
    }

    const { isActive, googleClientId, name, logoUrl, primaryColor, supportEmail } = req.body;

    if (typeof isActive !== "undefined") {
      app.isActive = isActive;
    }
    if (googleClientId !== undefined) {
      app.googleClientId = googleClientId ?? undefined;
    }

    // Apparence des e-mails : le nom de l'application est aussi celui affiché dans ses e-mails.
    if (name !== undefined) {
      app.name = name;
      app.set("branding.appName", name);
    }
    if (logoUrl !== undefined) app.set("branding.logoUrl", logoUrl ?? undefined);
    if (primaryColor !== undefined) app.set("branding.primaryColor", primaryColor ?? undefined);
    if (supportEmail !== undefined) app.set("branding.supportEmail", supportEmail);

    // URLs et vérification : seuls les champs envoyés changent ; null retire une URL optionnelle.
    const settings = [
      "redirectUrl",
      "resetPasswordUrl",
      "logoutUrl",
      "emailVerifiedUrl",
      "emailVerificationFailedUrl",
      "emailVerificationMode",
      "passwordResetMode",
      "requireEmailVerification",
    ] as const;
    for (const field of settings) {
      if (req.body[field] !== undefined) app.set(field, req.body[field] ?? undefined);
    }
    if (req.body.mfaVerificationMode !== undefined) {
      app.set("mfaSettings.verificationMode", req.body.mfaVerificationMode);
    }

    // Vérifié sur l'état final : passer en mode lien, ou retirer une URL alors qu'il est actif.
    if (
      app.emailVerificationMode === "link" &&
      (!app.emailVerifiedUrl || !app.emailVerificationFailedUrl)
    ) {
      throw createError(
        400,
        "verificationUrlsRequired",
        'emailVerifiedUrl and emailVerificationFailedUrl are required when emailVerificationMode is "link"'
      );
    }

    if (app.isModified()) {
      await app.save();
    }
    return res.status(200).json({
      isSuccess: true,
      message: "App client updated successfully",
      data: { appId: app.id },
    });
  } catch (error) {
    next(error);
  }
};

export default updateClientAppHandler;
