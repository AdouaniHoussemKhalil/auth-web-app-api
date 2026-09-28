import { Router } from "express";
import { tenantProtectedActionsAuthToken } from "../../middleware/security/tenantProtectedActionsAuthToken";
import { asyncHandler } from ".";
import { authRateLimiter } from "../../middleware/security/rateLimiter";
import getConsumersQuery from "../../handlers/queries/tenants/getConsumersQuery";
import getConsumerByIdQuery from "../../handlers/queries/tenants/getConsumerByIdQuery";
import { registerSchema } from "../../validation/users/registerSchema";
import registerHandler from "../../handlers/commands/tenants/registerHandler";
import validate from "../../middleware/validation/validateSchema";
import { loginByCodeMFASchema } from "../../validation/users/loginByCodeMFASchema";
import loginHandler from "../../handlers/commands/tenants/loginHandler";
import { googleRegister } from "../../handlers/commands/tenants/googleRegisterHandler";
import { googleLoginSchema } from "../../validation/users/googleLoginSchema";
import { loginSchema } from "../../validation/users/loginSchema";
import loginByCodeMFAHandler from "../../handlers/commands/tenants/loginByMFACodeHandler";
import refreshTokenHandler from "../../handlers/commands/tenants/refreshTokenHandler";
import logoutHandler from "../../handlers/commands/tenants/logoutHandler";
import { logoutSchema, refreshTokenSchema } from "../../validation/users/refreshTokenSchema";

const tenantsRoutes = Router();

/**
 * @swagger
 * /tenants/{tenantId}/app/{appId}/consumers:
 *   get:
 *     summary: Récupère la liste des consommateurs d'une application du tenant
 *     tags: [Tenants Authentication]
 *     parameters:
 *       - in: header
 *         name: X-Tenant-Id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des consommateurs récupérée avec succès
 *       401:
 *         description: Token tenant manquant
 */
tenantsRoutes.get(
  "/:tenantId/app/:appId/consumers",
  tenantProtectedActionsAuthToken,
  asyncHandler(getConsumersQuery)
);

/**
 * @swagger
 * /tenants/{tenantId}/app/{appId}/consumers/{consumerId}:
 *   get:
 *     summary: Récupère les détails d'un consommateur pour un tenant donné par id
 *     tags: [Tenants Authentication]
 *     parameters:
 *       - in: header
 *         name: X-Tenant-Id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: consumerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails du consommateur
 *       404:
 *         description: Consommateur introuvable
 */

tenantsRoutes.get(
  "/:tenantId/app/:appId/consumers/:consumerId",
  tenantProtectedActionsAuthToken,
  asyncHandler(getConsumerByIdQuery)
);

/**
 * @swagger
 * /tenants/register:
 *   post:
 *     summary: Enregistre un nouvel tenant
 *     tags: [Tenants Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/TenantRegister'
 *     responses:
 *       201:
 *         description: Tenant créé avec succès
 *       400:
 *         description: Echec de la création du tenant
 */

tenantsRoutes.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(registerHandler)
);

/**
 * @swagger
 * /tenants/loginByMFACode:
 *   post:
 *     summary: Valide le code MFA reçu par e-mail et retourne les tokens JWT du tenant
 *     tags: [Tenants Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/TenantMFALogin'
 *     responses:
 *       201:
 *         description: Connexion réussie
 *       400:
 *         description: Echec de la connexion du tenant
 */

tenantsRoutes.post(
  "/loginByMFACode",
  authRateLimiter,
  validate(loginByCodeMFASchema),
  asyncHandler(loginByCodeMFAHandler)
);

/**
 * @swagger
 * /tenants/login:
 *   post:
 *     summary: Vérifie le mot de passe du tenant et envoie un code MFA par e-mail
 *     tags: [Tenants Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/TenantLogin'
 *     responses:
 *       201:
 *         description: Connexion réussie
 *       400:
 *         description: Echec de la connexion du tenant
 */

tenantsRoutes.post("/login", authRateLimiter, validate(loginSchema), asyncHandler(loginHandler));

/**
 * @swagger
 * /tenants/google-register:
 *   post:
 *     summary: Authentifie un tenant avec google et retourne un token JWT
 *     tags: [Tenants Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/TenantGoogleAuth'
 *     responses:
 *       201:
 *         description: Connexion réussie
 *       400:
 *         description: Echec de la connexion du tenant
 */

tenantsRoutes.post(
  "/google-register",
  authRateLimiter,
  validate(googleLoginSchema),
  asyncHandler(googleRegister)
);

/**
 * @swagger
 * /tenants/refresh:
 *   post:
 *     summary: Échange un refresh token tenant contre une nouvelle paire de tokens (rotation)
 *     tags: [Tenants Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshToken'
 *     responses:
 *       200:
 *         description: Succès
 *       401:
 *         description: Refresh token invalide, expiré ou déjà utilisé
 */
tenantsRoutes.post(
  "/refresh",
  authRateLimiter,
  validate(refreshTokenSchema),
  asyncHandler(refreshTokenHandler)
);

/**
 * @swagger
 * /tenants/logout:
 *   post:
 *     summary: Révoque le refresh token tenant (ou toutes les sessions avec allDevices)
 *     tags: [Tenants Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Logout'
 *     responses:
 *       200:
 *         description: Succès
 *       401:
 *         description: Refresh token invalide, expiré ou déjà utilisé
 */
tenantsRoutes.post("/logout", validate(logoutSchema), asyncHandler(logoutHandler));

export default tenantsRoutes;
