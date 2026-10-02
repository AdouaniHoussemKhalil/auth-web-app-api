import { IAppClient } from "../../models/AppClient";
import { IConsumer } from "../../models/Consumer";
import { SecondaryUserAccessMethodType } from "../../models/subdocuments/SecondaryAccessMethod";
import { templates } from "../email/models/Template";
import sendTemplateEmail from "../email/sendMails";
import { emailBrandingOf } from "../email/branding";
import { setOneTimeCode } from "../security/oneTimeCode";
import { randomSixDigitCode } from "../../utils/random";

// Réponse d'une connexion qui attend le code MFA (à envoyer ensuite sur /consumers/auth/loginByMFA).
export const mfaRequiredResponse = {
  MFARequired: true,
  message: "MFA is required, Please check your email for the verification code.",
  isSuccess: true,
};

/** Enregistre un code de connexion MFA pour le consumer et le lui envoie par e-mail. */
export const sendLoginMFACode = async (user: IConsumer, appClient: IAppClient) => {
  const code = randomSixDigitCode();
  const expiresInMs = (appClient.mfaSettings?.expiryMinutes ?? 15) * 60 * 1000;
  await setOneTimeCode(user, SecondaryUserAccessMethodType.MFA, code, expiresInMs);
  await user.save();

  await sendTemplateEmail(templates.loginByCodeMFA.id, {
    recipient: { email: user.email, fullName: `${user.firstName} ${user.lastName}` },
    branding: emailBrandingOf(appClient),
    variable: code,
    expiresInMs,
  });
};
