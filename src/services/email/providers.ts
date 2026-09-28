import { logger } from "../../utils/logger";
import nodemailer from "nodemailer";

export type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  html: string;
  // Code ou lien contenu dans l'e-mail, affiché tel quel par le provider console.
  variable?: string;
};

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<unknown>;
}

export type SmtpSettings = {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: { user?: string; pass?: string };
};

// N'envoie rien : affiche l'e-mail dans le terminal. Pour le développement et les tests manuels.
export const consoleProvider: EmailProvider = {
  name: "console",
  async send(message) {
    logger.info(
      { from: message.from, to: message.to, subject: message.subject, code: message.variable },
      "E-mail (provider console, non envoyé)"
    );
    return { provider: "console" };
  },
};

export const createSmtpProvider = (smtp: SmtpSettings): EmailProvider => {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.auth?.user, pass: smtp.auth?.pass },
  });

  return {
    name: "smtp",
    send: ({ from, to, subject, html }) => transporter.sendMail({ from, to, subject, html }),
  };
};
