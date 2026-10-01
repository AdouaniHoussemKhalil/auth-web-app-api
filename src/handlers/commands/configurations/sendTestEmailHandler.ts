import { NextFunction, Request, Response } from "express";
import AppClient from "../../../models/AppClient";
import { Tenant } from "../../../models/Tenant";
import { createError } from "../../../middleware/error/errorHandler";
import { emailBrandingOf } from "../../../services/email/branding";
import { templates } from "../../../services/email/models/Template";
import sendTemplateEmail from "../../../services/email/sendMails";

/**
 * Envoie au tenant connecté un e-mail d'exemple aux couleurs de l'application, pour vérifier son
 * apparence (et la configuration d'envoi) sans créer d'utilisateur.
 */
const sendTestEmailHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, appId } = req.params;

    const [app, tenant] = await Promise.all([
      AppClient.findOne({ id: appId, tenantId }),
      Tenant.findOne({ id: tenantId }),
    ]);
    if (!app || !tenant) throw createError(404, "appNotFound", "App not found for this tenant");

    await sendTemplateEmail(templates.testEmail.id, {
      recipient: { email: tenant.email, fullName: `${tenant.firstName} ${tenant.lastName}` },
      branding: emailBrandingOf(app),
      variable: "123456",
      expiresInMs: 15 * 60 * 1000,
    });

    res
      .status(200)
      .json({ message: "Test email sent", data: { to: tenant.email }, isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default sendTestEmailHandler;
