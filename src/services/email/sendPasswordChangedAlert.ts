import { IAppClient } from "../../models/AppClient";
import { IUser } from "../../models/User";
import { logger } from "../../utils/logger";
import { emailBrandingOf } from "./branding";
import { templates } from "./models/Template";
import sendTemplateEmail from "./sendMails";

/**
 * Alerte de sécurité après un changement de mot de passe (réinitialisation ou modification).
 * Envoi au mieux : le mot de passe est déjà changé, un échec d'envoi est journalisé sans faire
 * échouer la requête. Sans application (tenant), l'e-mail prend l'identité du dashboard.
 */
export const sendPasswordChangedAlert = async (user: IUser, appClient?: IAppClient) => {
  try {
    await sendTemplateEmail(templates.passwordChanged.id, {
      recipient: { email: user.email, fullName: `${user.firstName} ${user.lastName}` },
      branding: appClient && emailBrandingOf(appClient),
    });
  } catch (err) {
    logger.error({ err, userId: user.id }, "Password changed alert could not be sent");
  }
};
