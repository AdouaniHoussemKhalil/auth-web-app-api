import config from "config";
import { Recipient } from "./models/Recipient";
import { TemplateId, templates } from "./models/Template";
import { createEmailSender } from "./emailSender";
import { BrevoSettings, SmtpSettings } from "./providers";
import { DASHBOARD_BRANDING, EmailBranding } from "./branding";
import { formatDuration, renderEmail } from "./layout";

const setting = <T>(key: string): T | undefined =>
  config.has(key) ? config.get<T>(key) : undefined;

const smtp = setting<SmtpSettings>("email.smtp");

const sendEmail = createEmailSender({
  provider: setting<string>("email.provider"),
  smtp,
  brevo: setting<BrevoSettings>("email.brevo"),
  isProduction: process.env.NODE_ENV === "production",
});

// Avec Gmail, l'adresse d'expédition doit être celle du compte SMTP.
const fromAddress = setting<string>("email.from") ?? smtp?.auth?.user ?? "no-reply@localhost";

/**
 * Envoie un e-mail à partir d'un template. `branding` : identité de l'application du consumer
 * (`emailBrandingOf(appClient)`) ; absent, l'identité du dashboard (e-mails des tenants).
 */
export default async function sendTemplateEmail<T extends TemplateId>(
  templateId: T,
  {
    recipient,
    branding = DASHBOARD_BRANDING,
    variable,
    expiresInMs,
  }: {
    recipient: Recipient;
    branding?: EmailBranding;
    variable?: string;
    /** Durée de validité du code ou du lien, affichée dans l'e-mail. */
    expiresInMs?: number;
  }
) {
  const template = templates[templateId];
  if (!template) throw new Error(`Template "${templateId}" not found`);

  const content = template.content({
    appName: branding.appName,
    variable: variable ?? "",
    expiresIn: expiresInMs ? formatDuration(expiresInMs) : undefined,
  });
  const { html, text } = renderEmail(content, { recipientFullName: recipient.fullName, branding });

  // Le nom d'expéditeur est celui de l'application ; les guillemets y sont retirés (en-tête From).
  return sendEmail({
    from: `"${branding.appName.replace(/["\\\r\n]/g, "")}" <${fromAddress}>`,
    to: recipient.email,
    subject: content.subject,
    html,
    text,
    variable,
  });
}
