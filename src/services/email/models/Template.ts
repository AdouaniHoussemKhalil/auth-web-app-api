import { EmailContent } from "../layout";

/** Données propres à un envoi. */
export interface TemplateContext {
  appName: string;
  /** Code à usage unique ou lien de vérification. */
  variable: string;
  /** Durée de validité lisible (« 15 minutes »), si le code ou le lien expire. */
  expiresIn?: string;
}

const expiry = (what: string, expiresIn?: string) =>
  expiresIn ? `${what} expire dans ${expiresIn}.` : undefined;

const NOT_YOU = "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.";

// Contenu de chaque e-mail ; la mise en forme (couleurs, logo, pied de page) est commune : voir layout.ts.
// Textes en français ; `id` est aussi la clé du réglage d'activation par application (branding.templates).
export const templates = {
  emailVerification: {
    id: "emailVerification",
    content: ({ appName, variable, expiresIn }: TemplateContext): EmailContent => ({
      subject: `Votre code de vérification ${appName}`,
      preheader: `Votre code : ${variable}`,
      title: "Confirmez votre adresse e-mail",
      paragraphs: [
        `Merci pour votre inscription sur ${appName}. Saisissez ce code pour confirmer votre adresse :`,
      ],
      code: variable,
      expiry: expiry("Ce code", expiresIn),
      notice: "Si vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail.",
    }),
  },

  forgotPassword: {
    id: "forgotPassword",
    content: ({ appName, variable, expiresIn }: TemplateContext): EmailContent => ({
      subject: `Réinitialisation de votre mot de passe ${appName}`,
      preheader: `Votre code de réinitialisation : ${variable}`,
      title: "Réinitialisez votre mot de passe",
      paragraphs: [
        "Vous avez demandé à réinitialiser votre mot de passe. Saisissez ce code pour continuer :",
      ],
      code: variable,
      expiry: expiry("Ce code", expiresIn),
      notice: `${NOT_YOU} Votre mot de passe actuel reste valable.`,
    }),
  },

  loginByCodeMFA: {
    id: "loginByCodeMFA",
    content: ({ appName, variable, expiresIn }: TemplateContext): EmailContent => ({
      subject: `Votre code de connexion ${appName}`,
      preheader: `Votre code de connexion : ${variable}`,
      title: "Votre code de connexion",
      paragraphs: [`Pour terminer votre connexion à ${appName}, saisissez ce code :`],
      code: variable,
      expiry: expiry("Ce code", expiresIn),
      notice:
        "Vous n'essayez pas de vous connecter ? Quelqu'un connaît peut-être votre mot de passe : changez-le dès que possible.",
    }),
  },

  activateMFA: {
    id: "activateMFA",
    content: ({ variable, expiresIn }: TemplateContext): EmailContent => ({
      subject: "Activez la vérification en deux étapes",
      preheader: `Votre code d'activation : ${variable}`,
      title: "Activez la vérification en deux étapes",
      paragraphs: [
        "Avec la vérification en deux étapes, un code vous sera demandé par e-mail à chaque connexion. Saisissez ce code pour l'activer :",
      ],
      code: variable,
      expiry: expiry("Ce code", expiresIn),
      notice: NOT_YOU,
    }),
  },

  deactivateMFA: {
    id: "deactivateMFA",
    content: ({ variable, expiresIn }: TemplateContext): EmailContent => ({
      subject: "Désactivez la vérification en deux étapes",
      preheader: `Votre code de désactivation : ${variable}`,
      title: "Désactivez la vérification en deux étapes",
      paragraphs: ["Saisissez ce code pour désactiver la vérification en deux étapes :"],
      code: variable,
      expiry: expiry("Ce code", expiresIn),
      notice: `${NOT_YOU} Sans ce code, la vérification en deux étapes reste active.`,
    }),
  },

  mfaActivationRequest: {
    id: "mfaActivationRequest",
    content: ({ variable, expiresIn }: TemplateContext): EmailContent => ({
      subject: "Activez la vérification en deux étapes",
      preheader: "Confirmez l'activation de la vérification en deux étapes.",
      title: "Activez la vérification en deux étapes",
      paragraphs: [
        "Avec la vérification en deux étapes, un code vous sera demandé par e-mail à chaque connexion. Confirmez l'activation :",
      ],
      button: { label: "Activer la vérification", url: variable },
      expiry: expiry("Ce lien", expiresIn),
      notice: NOT_YOU,
    }),
  },

  mfaDeactivationRequest: {
    id: "mfaDeactivationRequest",
    content: ({ variable, expiresIn }: TemplateContext): EmailContent => ({
      subject: "Désactivez la vérification en deux étapes",
      preheader: "Confirmez la désactivation de la vérification en deux étapes.",
      title: "Désactivez la vérification en deux étapes",
      paragraphs: ["Confirmez la désactivation de la vérification en deux étapes :"],
      button: { label: "Désactiver la vérification", url: variable },
      expiry: expiry("Ce lien", expiresIn),
      notice: `${NOT_YOU} Sans confirmation, la vérification en deux étapes reste active.`,
    }),
  },

  successfullyActivatedMFA: {
    id: "successfullyActivatedMFA",
    content: ({ appName }: TemplateContext): EmailContent => ({
      subject: "Vérification en deux étapes activée",
      preheader: "Votre compte est mieux protégé.",
      title: "Vérification en deux étapes activée",
      paragraphs: [
        `Votre compte ${appName} est maintenant mieux protégé.`,
        "À chaque connexion, un code vous sera envoyé à cette adresse e-mail.",
      ],
      notice:
        "Vous n'avez pas fait cette modification ? Changez votre mot de passe et contactez le support.",
    }),
  },

  successfullyDeactivatedMFA: {
    id: "successfullyDeactivatedMFA",
    content: ({ appName }: TemplateContext): EmailContent => ({
      subject: "Vérification en deux étapes désactivée",
      preheader: "La vérification en deux étapes est désactivée.",
      title: "Vérification en deux étapes désactivée",
      paragraphs: [
        `La vérification en deux étapes est désactivée sur votre compte ${appName}.`,
        "Nous vous recommandons de la réactiver : elle protège votre compte même si votre mot de passe est connu.",
      ],
      notice:
        "Vous n'avez pas fait cette modification ? Changez votre mot de passe et réactivez la vérification.",
    }),
  },
} as const;

export type TemplateId = keyof typeof templates;
