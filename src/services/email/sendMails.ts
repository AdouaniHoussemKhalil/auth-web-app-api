import { Recipient } from "./models/Recipient";
import { TemplateId, templates } from "./models/Template";

const nodemailer = require("nodemailer");
const config = require("config");

const smtp = config.get("email.smtp");

const transporter = nodemailer.createTransport({
  host: smtp.host,
  port: smtp.port,
  secure: smtp.secure,
  auth: {
    user: smtp.auth.user,
    pass: smtp.auth.pass,
  },
});

export default async function sendTemplateEmail<T extends TemplateId>(
  templateId: T,
  {
    recipient,
    appClientBranding,
    variable,
  }: {
    recipient: Recipient;
    appClientBranding: {
      appName: string;
      primaryColor: string;
      logoUrl?: string;
    };
    variable?: string;
  }
) {
  const template = templates[templateId];

  if (!template) throw new Error(`Template "${templateId}" not found`);

  const html = template.getHtml({
    recipientFullName: recipient.fullName,
    primaryColor: appClientBranding.primaryColor,
    logoUrl: appClientBranding.logoUrl,
    variable: variable ?? "",
  });

  const info = await transporter.sendMail({
    from: `"${appClientBranding.appName}" <no-reply@yourapp.com>`,
    to: recipient.email,
    subject: template.subject,
    html,
  });

  return info;
}
