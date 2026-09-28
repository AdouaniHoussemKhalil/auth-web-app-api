import config from "config";
import { Recipient } from "./models/Recipient";
import { TemplateId, templates } from "./models/Template";
import { createEmailSender } from "./emailSender";
import { SmtpSettings } from "./providers";

const setting = <T>(key: string): T | undefined =>
  config.has(key) ? config.get<T>(key) : undefined;

const smtp = setting<SmtpSettings>("email.smtp");

const sendEmail = createEmailSender({
  provider: setting<string>("email.provider"),
  smtp,
  isProduction: process.env.NODE_ENV === "production",
});

// Avec Gmail, l'adresse d'expédition doit être celle du compte SMTP.
const fromAddress = setting<string>("email.from") ?? smtp?.auth?.user ?? "no-reply@localhost";
const defaultSenderName = setting<string>("email.info.from") ?? "Auth service";

export default async function sendTemplateEmail<T extends TemplateId>(
  templateId: T,
  {
    recipient,
    appClientBranding,
    variable,
  }: {
    recipient: Recipient;
    appClientBranding?: {
      appName?: string;
      primaryColor?: string;
      logoUrl?: string;
    };
    variable?: string;
  }
) {
  const template = templates[templateId];

  if (!template) throw new Error(`Template "${templateId}" not found`);

  const html = template.getHtml({
    recipientFullName: recipient.fullName,
    primaryColor: appClientBranding?.primaryColor ?? "#f6f3f3ff",
    logoUrl: appClientBranding?.logoUrl,
    variable: variable ?? "",
  });

  return sendEmail({
    from: `"${appClientBranding?.appName ?? defaultSenderName}" <${fromAddress}>`,
    to: recipient.email,
    subject: template.subject,
    html,
    variable,
  });
}
