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

export type BrevoSettings = { apiKey?: string };

export const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// "Nom" <adresse@domaine> -> { name, email }
const parseAddress = (from: string) => {
  const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return match ? { name: match[1].trim() || undefined, email: match[2] } : { email: from.trim() };
};

/**
 * API HTTP de Brevo (ex-Sendinblue) : passe par HTTPS, utilisable chez les hébergeurs qui bloquent
 * les ports SMTP (Render). L'adresse d'expédition doit être un expéditeur vérifié dans Brevo.
 */
export const createBrevoProvider = ({ apiKey }: BrevoSettings): EmailProvider => ({
  name: "brevo",
  async send({ from, to, subject, html }) {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey as string,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseAddress(from),
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Brevo API error ${response.status}: ${await response.text()}`);
    }
    return response.json();
  },
});
