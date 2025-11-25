import { Router } from "express";
import { tenantProtectedActionsAuthToken } from "../../middleware/security/tenantProtectedActionsAuthToken";
import { asyncHandler } from ".";
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

const tenantsRoutes = Router();

/**
 * @swagger
 * /tenants/{tenantId}/consumers:
 *   get:
 *     summary: Récupère la liste des consommateurs pour un tenant donné
 *     tags: [Tenants Authentication]
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/TenantConsumers'
 *     responses:
 *       201:
 *         description: Liste des consommateurs récupérée avec succès
 *       400:
 *         description: Liste des consommateurs non récupérée
 */
tenantsRoutes.get(
  "/tenants/{tenantId}/consumers",
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
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/TenantConsumers'
 *     responses:
 *       201:
 *         description: Liste des consommateurs récupérée avec succès
 *       400:
 *         description: Liste des consommateurs non récupérée
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
  validate(registerSchema),
  asyncHandler(registerHandler)
);

/**
 * @swagger
 * /tenants/login:
 *   post:
 *     summary: Authentifie un tenant avec MFA et retourne un token JWT
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
  validate(loginByCodeMFASchema),
  asyncHandler(loginByCodeMFAHandler)
);

/**
 * @swagger
 * /tenants/login:
 *   post:
 *     summary: Authentifie un tenant  et retourne un token JWT
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

tenantsRoutes.post(
  "/login",
  validate(loginSchema),
  asyncHandler(loginHandler)
);

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
  validate(googleLoginSchema),
  asyncHandler(googleRegister)
);

export default tenantsRoutes;
