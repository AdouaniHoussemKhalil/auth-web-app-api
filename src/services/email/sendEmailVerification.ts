import { IAppClient } from "../../models/AppClient";
import { IUser } from "../../models/User";
import { SecondaryUserAccessMethodType } from "../../models/subdocuments/SecondaryAccessMethod";
import { randomSixDigitCode, randomToken } from "../../utils/random";
import { setOneTimeCode } from "../security/oneTimeCode";
import { templates } from "./models/Template";
import sendTemplateEmail from "./sendMails";
import { emailBrandingOf } from "./branding";
import { emailVerificationLink } from "./links";

export const EMAIL_VERIFICATION_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Génère un code (ou, si l'application est en mode lien, un lien) de vérification, l'enregistre sur
 * l'utilisateur et l'envoie par e-mail. Avec l'application du consumer, l'e-mail reprend son branding ;
 * sans (tenant), celui du dashboard.
 */
export const sendEmailVerification = async (user: IUser, appClient?: IAppClient) => {
  const byLink = appClient?.emailVerificationMode === "link";
  // Lien : jeton long (256 bits) ; code : 6 chiffres saisis par l'utilisateur.
  const code = byLink ? randomToken() : randomSixDigitCode();
  await setOneTimeCode(
    user,
    SecondaryUserAccessMethodType.EmailVerification,
    code,
    EMAIL_VERIFICATION_EXPIRATION_MS
  );
  await user.save();

  await sendTemplateEmail(
    byLink ? templates.emailVerificationLink.id : templates.emailVerification.id,
    {
      recipient: { email: user.email, fullName: `${user.firstName} ${user.lastName}` },
      branding: appClient && emailBrandingOf(appClient),
      variable: byLink ? emailVerificationLink(user.id, code) : code,
      expiresInMs: EMAIL_VERIFICATION_EXPIRATION_MS,
    }
  );
};
