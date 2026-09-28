import { IAppClient } from "../../models/AppClient";
import { IConsumer } from "../../models/Consumer";
import { SecondaryUserAccessMethodType } from "../../models/subdocuments/SecondaryAccessMethod";
import { randomSixDigitCode } from "../../utils/random";
import { setOneTimeCode } from "../security/oneTimeCode";
import { templates } from "./models/Template";
import sendTemplateEmail from "./sendMails";

export const EMAIL_VERIFICATION_EXPIRATION_MS = 24 * 60 * 60 * 1000;

// Génère un code de vérification, l'enregistre sur le consumer et l'envoie par e-mail.
export const sendEmailVerification = async (user: IConsumer, appClient: IAppClient) => {
  const code = randomSixDigitCode();
  await setOneTimeCode(
    user,
    SecondaryUserAccessMethodType.EmailVerification,
    code,
    EMAIL_VERIFICATION_EXPIRATION_MS
  );
  await user.save();

  await sendTemplateEmail(templates.emailVerification.id, {
    recipient: { email: user.email, fullName: `${user.firstName} ${user.lastName}` },
    appClientBranding: {
      appName: appClient.branding?.appName,
      primaryColor: appClient.branding?.primaryColor,
      logoUrl: appClient.branding?.logoUrl,
    },
    variable: code,
  });
};
