export enum EmailTemplateType {
  ForgotPassword = "forgotPasswordEmail",
  LoginByCodeMFA = "loginByCodeMFAEmail",
  ActivateMFA = "activateMFAEmail",
  DeactivateMFA = "deactivateMFAEmail",
  SuccessfullyActivatedMFA = "successfullyActivatedMFAEmail",
  SuccessfullyDeactivatedMFA = "successfullyDeactivatedMFAEmail",
  MFAActivationRequest = "mfaActivationRequestEmail",
  MFADeactivationRequest = "mfaDeactivationRequestEmail"
}

export const emailTemplates = {
  forgotPasswordEmail: (recipientFullName: string, resetCode: string) =>
    getForgotPasswordEmailHtml(recipientFullName, resetCode),

  activateMFAEmail: (recipientFullName: string, MFACode: string) =>
    getActivateMFAEmailHtml(recipientFullName, MFACode),

  successfullyActivatedMFAEmail: (recipientFullName: string) =>
    getSuccessfullyActivatedMFAEmailHtml(recipientFullName),

  successfullyDeactivatedMFAEmail: (recipientFullName: string) =>
    getSuccessfullyDeactivatedMFAEmailHtml(recipientFullName),

  loginByCodeMFAEmail: (recipientFullName: string, MFACode: string) =>
    getLoginByCodeMFAEmailHtml(recipientFullName, MFACode),

  mfaActivationRequestEmail: (recipientFullName: string, link: string) =>
    getMFAActivationRequestEmailHtml(recipientFullName, link),

  mfaDeactivationRequestEmail: (recipientFullName: string, link: string) =>
    getMFADeactivationRequestEmailHtml(recipientFullName, link)
};

//
// 🔹 Templates HTML
//

const getForgotPasswordEmailHtml = (recipientFullName: string, resetCode: string): string => `
  <div>
    <img src="https://cdn.pixabay.com/photo/2017/04/10/12/18/castle-2218358_1280.jpg" alt="Logo" style="width: 100px; margin-bottom: 20px;">
    <h3>Bonjour ${recipientFullName},</h3>
    <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
    <p>Utilisez le code suivant pour confirmer votre demande :</p>
    <p style="font-size: 18px; font-weight: bold;">Code de confirmation : <strong>${resetCode}</strong></p>
    <p>Ce code expirera dans quelques minutes.</p>
    <p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>
  </div>
`;

const getActivateMFAEmailHtml = (recipientFullName: string, MFACode: string): string => `
  <div>
    <img src="https://cdn.pixabay.com/photo/2017/04/10/12/18/castle-2218358_1280.jpg" alt="Logo" style="width: 100px; margin-bottom: 20px;">
    <h3>Bonjour ${recipientFullName},</h3>
    <p>Pour activer la vérification en deux étapes (MFA), veuillez saisir le code ci-dessous :</p>
    <p style="font-size: 18px; font-weight: bold;">Code de vérification : <strong>${MFACode}</strong></p>
    <p>Ce code est valable pendant quelques minutes uniquement.</p>
  </div>
`;

const getLoginByCodeMFAEmailHtml = (recipientFullName: string, MFACode: string): string => `
  <div>
    <img src="https://cdn.pixabay.com/photo/2017/04/10/12/18/castle-2218358_1280.jpg" alt="Logo" style="width: 100px; margin-bottom: 20px;">
    <h3>Bonjour ${recipientFullName},</h3>
    <p>Pour finaliser votre connexion, veuillez saisir le code de vérification ci-dessous :</p>
    <p style="font-size: 18px; font-weight: bold;">Code de connexion : <strong>${MFACode}</strong></p>
    <p>Ce code expirera dans quelques minutes.</p>
    <p>Si vous n’avez pas tenté de vous connecter, veuillez ignorer cet e-mail.</p>
  </div>
`;

const getSuccessfullyActivatedMFAEmailHtml = (recipientFullName: string): string => `
  <div>
    <img src="https://cdn.pixabay.com/photo/2017/04/10/12/18/castle-2218358_1280.jpg" alt="Logo" style="width: 100px; margin-bottom: 20px;">
    <h3>Bonjour ${recipientFullName},</h3>
    <p>Votre authentification à deux facteurs (MFA) a été activée avec succès ✅.</p>
    <p>Lors de votre prochaine connexion, vous devrez entrer un code de vérification envoyé par e-mail ou via votre méthode MFA.</p>
    <p>Merci de renforcer la sécurité de votre compte !</p>
  </div>
`;

const getSuccessfullyDeactivatedMFAEmailHtml = (recipientFullName: string): string => `
  <div>
    <img src="https://cdn.pixabay.com/photo/2017/04/10/12/18/castle-2218358_1280.jpg" alt="Logo" style="width: 100px; margin-bottom: 20px;">
    <h3>Bonjour ${recipientFullName},</h3>
    <p>Votre authentification à deux facteurs (MFA) a été désactivée avec succès.</p>
    <p>Vous pourrez désormais vous connecter uniquement avec votre mot de passe.</p>
    <p>Si vous n’êtes pas à l’origine de cette action, contactez immédiatement notre support.</p>
  </div>
`;

const getMFAActivationRequestEmailHtml = (recipientFullName: string, link: string): string => `
  <div>
    <img src="https://cdn.pixabay.com/photo/2017/04/10/12/18/castle-2218358_1280.jpg" alt="Logo" style="width: 100px; margin-bottom: 20px;">
    <h3>Bonjour ${recipientFullName},</h3>
    <p>Vous avez demandé à activer l’authentification à deux facteurs (MFA).</p>
    <p>Pour confirmer cette demande, cliquez sur le lien ci-dessous :</p>
    <p><a href="${link}" style="font-size: 18px; font-weight: bold;">Activer la vérification en deux étapes</a></p>
    <p>Ce lien expirera dans quelques minutes.</p>
  </div>
`;

const getMFADeactivationRequestEmailHtml = (recipientFullName: string, link: string): string => `
  <div>
    <img src="https://cdn.pixabay.com/photo/2017/04/10/12/18/castle-2218358_1280.jpg" alt="Logo" style="width: 100px; margin-bottom: 20px;">
    <h3>Bonjour ${recipientFullName},</h3>
    <p>Vous avez demandé à désactiver l’authentification à deux facteurs (MFA).</p>
    <p>Pour confirmer la désactivation, cliquez sur le lien ci-dessous :</p>
    <p><a href="${link}" style="font-size: 18px; font-weight: bold;">Confirmer la désactivation</a></p>
    <p>Ce lien expirera dans quelques minutes.</p>
    <p>Si vous n’avez pas effectué cette demande, ignorez simplement cet e-mail.</p>
  </div>
`;
