import { logger } from "../../utils/logger";
import {
  EmailMessage,
  EmailProvider,
  SmtpSettings,
  consoleProvider,
  createSmtpProvider,
} from "./providers";

export type EmailSettings = {
  provider?: string;
  smtp?: SmtpSettings;
  isProduction: boolean;
};

const hasSmtpCredentials = (smtp?: SmtpSettings) =>
  Boolean(smtp?.host && smtp.auth?.user && smtp.auth?.pass);

/**
 * Choisit le provider d'e-mails :
 * - "console" : affichage dans le terminal ;
 * - "smtp" (défaut) : Nodemailer, ou console si les identifiants SMTP ne sont pas renseignés.
 */
export const resolveEmailProvider = (settings: EmailSettings): EmailProvider => {
  const provider = settings.provider ?? "smtp";

  if (provider === "console") {
    if (settings.isProduction) {
      logger.warn("Email provider is 'console' in production: codes will appear in the logs");
    }
    return consoleProvider;
  }

  if (provider !== "smtp") {
    throw new Error(`Unknown email provider "${provider}" (expected "smtp" or "console")`);
  }

  if (!hasSmtpCredentials(settings.smtp)) {
    logger.warn("SMTP credentials are missing: emails will be printed to the console");
    return consoleProvider;
  }

  return createSmtpProvider(settings.smtp as SmtpSettings);
};

/**
 * Envoie avec le provider choisi. Hors production, un échec d'envoi est journalisé et l'e-mail
 * est affiché en console pour ne pas bloquer le développement ; en production l'erreur remonte.
 */
export const createEmailSender = (settings: EmailSettings) => {
  const provider = resolveEmailProvider(settings);

  return async (message: EmailMessage) => {
    try {
      return await provider.send(message);
    } catch (error) {
      if (settings.isProduction || provider === consoleProvider) throw error;

      logger.warn(
        { err: error, provider: provider.name },
        "Email provider failed, falling back to console"
      );
      return consoleProvider.send(message);
    }
  };
};
