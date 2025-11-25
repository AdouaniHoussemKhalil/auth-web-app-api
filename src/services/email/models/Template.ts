export interface EmailBaseProps {
  recipientFullName: string;
  primaryColor: string;
  variable?: string;
  logoUrl?: string;
}

const renderBaseTemplate = (content: string, props: EmailBaseProps) => `
  <div style="background-color: ${
    props.primaryColor
  }; padding: 20px; border-radius: 5px;">
    <img src="${
      props.logoUrl ||
      "https://cdn.pixabay.com/photo/2017/04/10/12/18/castle-2218358_1280.jpg"
    }" alt="Logo" style="width: 100px; margin-bottom: 20px;">
    <h3>Bonjour ${props.recipientFullName},</h3>
    ${content}
  </div>
`;

export const templates = {
  forgotPassword: {
    id: "forgotPassword",
    subject: "Réinitialisation de votre mot de passe",
    getHtml: ({
      recipientFullName,
      primaryColor,
      logoUrl,
      variable,
    }: EmailBaseProps) =>
      renderBaseTemplate(
        `
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Utilisez le code suivant pour confirmer votre demande :</p>
        <p style="font-size: 18px; font-weight: bold;">
          Code de confirmation : <strong>${variable}</strong>
        </p>
        <p>Ce code expirera dans quelques minutes.</p>
        <p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>
      `,
        { recipientFullName, primaryColor, logoUrl, variable }
      ),
  },

  loginByCodeMFA: {
    id: "loginByCodeMFA",
    subject: "Connexion par code - Authentification à deux facteurs",
    getHtml: ({
      recipientFullName,
      primaryColor,
      logoUrl,
      variable,
    }: EmailBaseProps & { variable: string }) =>
      renderBaseTemplate(
        `
        <p>Pour finaliser votre connexion, veuillez saisir le code ci-dessous :</p>
        <p style="font-size: 18px; font-weight: bold;">
          Code de connexion : <strong>${variable}</strong>
        </p>
        <p>Ce code expirera dans quelques minutes.</p>
      `,
        { recipientFullName, primaryColor, logoUrl, variable }
      ),
  },

  activateMFA: {
    id: "activateMFA",
    subject: "Activation de la vérification en deux étapes",
    getHtml: ({
      recipientFullName,
      primaryColor,
      logoUrl,
      variable,
    }: EmailBaseProps) =>
      renderBaseTemplate(
        `
        <p>Pour activer la vérification en deux étapes (MFA), veuillez saisir le code ci-dessous :</p>
        <p style="font-size: 18px; font-weight: bold;">
          Code de vérification : <strong>${variable}</strong>
        </p>
      `,
        { recipientFullName, primaryColor, logoUrl, variable }
      ),
  },

  deactivateMFA: {
    id: "deactivateMFA",
    subject: "Désactivation de la vérification en deux étapes",
    getHtml: ({
      recipientFullName,
      primaryColor,
      logoUrl,
      variable,
    }: EmailBaseProps) =>
      renderBaseTemplate(
        `
        <p>Pour désactiver la vérification en deux étapes (MFA), veuillez saisir le code ci-dessous :</p>
        <p style="font-size: 18px; font-weight: bold;">
          Code de vérification : <strong>${variable}</strong>
        </p>
      `,
        { recipientFullName, primaryColor, logoUrl, variable }
      ),
  },

  mfaActivationRequest: {
    id: "mfaActivationRequest",
    subject: "Demande d'activation de la vérification en deux étapes",
    getHtml: (props: EmailBaseProps) =>
      renderBaseTemplate(
        `<p>Pour activer la vérification en deux étapes (MFA), veuillez cliquer sur le lien ci-dessous :</p>
        <p style="font-size: 18px; font-weight: bold;">
          Lien d'activation : <a href="${props.variable}"><strong>Activer MFA</strong></a>
        </p>`,
        props
      ),
  },

  mfaDeactivationRequest: {
    id: "mfaDeactivationRequest",
    subject: "Demande de désactivation de la vérification en deux étapes",
    getHtml: (props: EmailBaseProps) =>
      renderBaseTemplate(
        `<p>Pour désactiver la vérification en deux étapes (MFA), veuillez cliquer sur le lien ci-dessous :</p>
        <p style="font-size: 18px; font-weight: bold;">
          Lien de désactivation : <a href="${props.variable}"><strong>Désactiver MFA</strong></a>
        </p>`,
        props
      ),
  },

  successfullyActivatedMFA: {
    id: "successfullyActivatedMFA",
    subject: "Vérification en deux étapes activée",
    getHtml: (props: EmailBaseProps) =>
      renderBaseTemplate(
        `<b>Félicitations ! Votre vérification en deux étapes (MFA) a été activée avec succès.</b>
        <p>Vous pouvez maintenant vous connecter en toute sécurité.</p>
        <p>Pour votre prochaine connexion, veuillez utiliser le code de vérification envoyé à votre adresse e-mail.</p>
        `,
        props
      ),
  },

  successfullyDeactivatedMFA: {
    id: "successfullyDeactivatedMFA",
    subject: "Vérification en deux étapes désactivée",
    getHtml: (props: EmailBaseProps) =>
      renderBaseTemplate(
        `<b>Votre vérification en deux étapes (MFA) a été désactivée avec succès.</b>
        <p>La vérification en deux étapes (MFA) renforce la sécurité de votre compte.</p>
        <p>Essayez de l'activer à nouveau si nécessaire.</p>
        `,
        props
      ),
  },
} as const;

export type TemplateId = keyof typeof templates;
