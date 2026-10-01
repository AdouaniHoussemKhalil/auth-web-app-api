import { Router } from "express";
import { asyncHandler } from ".";
import { authRateLimiter } from "../../middleware/security/rateLimiter";
import verifyEmailLinkHandler from "../../handlers/queries/consumers/verifyEmailLinkHandler";

// Liens ouverts depuis un e-mail par l'utilisateur final : pas d'en-têtes x-app-id / x-app-secret,
// le jeton du lien sert d'autorisation.
const consumerLinksRoutes = Router();

/**
 * @swagger
 * /consumers/auth/verify-email-link:
 *   get:
 *     summary: Lien de vérification d'e-mail (mode « lien »), ouvert depuis l'e-mail
 *     description: >
 *       Vérifie l'adresse puis redirige (303) vers l'emailVerifiedUrl de l'application, ou vers son
 *       emailVerificationFailedUrl avec ?reason=expired|invalid. Sans URL configurée, affiche une page
 *       simple. Un lien rouvert sur une adresse déjà vérifiée mène au succès.
 *     tags: [Consumers Authentication]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: u
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant du consumer
 *       - in: query
 *         name: t
 *         required: true
 *         schema:
 *           type: string
 *         description: Jeton à usage unique reçu par e-mail
 *     responses:
 *       303:
 *         description: Redirection vers l'URL de succès ou d'échec de l'application
 *       200:
 *         description: Adresse confirmée (page simple, sans URL de succès configurée)
 *       400:
 *         description: Lien invalide ou expiré (page simple, sans URL d'échec configurée)
 */
consumerLinksRoutes.get(
  "/auth/verify-email-link",
  authRateLimiter,
  asyncHandler(verifyEmailLinkHandler)
);

export default consumerLinksRoutes;
