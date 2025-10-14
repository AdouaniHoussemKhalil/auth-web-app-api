import { Recipient } from "./models/Recipient";
import { emailTemplates, EmailTemplateType } from "./models/Template";

const nodemailer = require("nodemailer");
const config = require("config");

export const sendMailAsync = async (
  recipient: Recipient,
  emailType: EmailTemplateType,
  appClientBranding: {
    appName: string;
    logoUrl?: string;
  },
  value?: string
) => {
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

  const info = await transporter.sendMail({
    from: appClientBranding.appName,
    to: recipient.email,
    subject: emailType,
    html: getEmailTemplate(emailType, recipient.fullName, value),
  });

  console.log(info, "sent mail to : ", recipient.email);
};

const getEmailTemplate = (
  emailType: EmailTemplateType,
  recipientFullName: string,
  value?: string
) => {
  switch (emailType) {
    case EmailTemplateType.ForgotPassword:
      return emailTemplates.forgotPasswordEmail(
        recipientFullName,
        value ?? "Inconnu"
      );
    case EmailTemplateType.ActivateMFA:
      return emailTemplates.successfullyActivatedMFAEmail(
        recipientFullName
      );
    case EmailTemplateType.DeactivateMFA:
      return emailTemplates.successfullyDeactivatedMFAEmail(
        recipientFullName
      );
    case EmailTemplateType.MFAActivationRequest:
      return emailTemplates.mfaActivationRequestEmail(
        recipientFullName,
        value ?? "Inconnu"
      );
    case EmailTemplateType.MFADeactivationRequest:
      return emailTemplates.mfaDeactivationRequestEmail(
        recipientFullName,
        value ?? "Inconnu"
      );
    default:
      throw new Error("Unknown email type");
  }
};
