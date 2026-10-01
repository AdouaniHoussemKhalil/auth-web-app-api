import { Router } from "express";
import validate from "../../middleware/validation/validateSchema";
import { asyncHandler } from ".";
import validateQuery from "../../middleware/validation/validateQuery";
import { paginationSchema } from "../../validation/paginationSchema";
import { requireScope } from "../../middleware/security/requireScope";
import { createClientAppSchema } from "../../validation/configurations/createClientAppSchema";
import createClientAppHandler from "../../handlers/commands/configurations/createClientAppHandler";
import { tenantProtectedActionsAuthToken } from "../../middleware/security/tenantProtectedActionsAuthToken";
import updateClientAppHandler from "../../handlers/commands/configurations/updateClientAppHandler";
import { updateClientAppSchema } from "../../validation/configurations/updateClientAppSchema";
import getAppClientsQuery from "../../handlers/queries/configurations/getAppClientsQuery";
import getAppClientByIdQuery from "../../handlers/queries/configurations/getAppClientByIdQuery";
import rotateClientAppSecretHandler from "../../handlers/commands/configurations/rotateClientAppSecretHandler";
import sendTestEmailHandler from "../../handlers/commands/configurations/sendTestEmailHandler";
import { authRateLimiter } from "../../middleware/security/rateLimiter";

const configurationsRoutes = Router();

/**
 * @swagger
 * /config/apps/create:
 *   post:
 *     summary: Crée une nouvelle application cliente
 *     tags: [Configurations]
 *     parameters:
 *       - in: header
 *         name: X-Tenant-Id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/ClientAppCreate'
 *     responses:
 *       201:
 *         description: Application cliente créée avec succès
 *       400:
 *         description: Données invalides
 */

configurationsRoutes.post(
  "/apps/create",
  tenantProtectedActionsAuthToken,
  validate(createClientAppSchema),
  requireScope("app:create"),
  asyncHandler(createClientAppHandler)
);

/**
 * @swagger
 * /config/apps/update/{tenantId}/{appId}:
 *   put:
 *     summary: Met à jour une application cliente existante
 *     tags: [Configurations]
 *     parameters:
 *       - in: header
 *         name: X-Tenant-Id
 *         required: true
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/ClientAppUpdate'
 *     responses:
 *       200:
 *         description: Application cliente mise à jour avec succès
 *       400:
 *         description: Données invalides
 */

configurationsRoutes.put(
  "/apps/update/:tenantId/:appId",
  tenantProtectedActionsAuthToken,
  validate(updateClientAppSchema),
  requireScope("app:update"),
  asyncHandler(updateClientAppHandler)
);

/**
 * @swagger
 * /config/apps/{tenantId}:
 *   get:
 *     summary: Récupère les applications clientes existantes pour un locataire
 *     tags: [Configurations]
 *     parameters:
 *       - in: header
 *         name: X-Tenant-Id
 *         required: true
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Applications clientes récupérées avec succès
 *       400:
 *         description: Echec de récupération des applications clientes
 */

configurationsRoutes.get(
  "/apps/:tenantId",
  tenantProtectedActionsAuthToken,
  validateQuery(paginationSchema),
  requireScope("app:read"),
  asyncHandler(getAppClientsQuery)
);

/**
 * @swagger
 * /config/apps/{tenantId}/{appId}:
 *   get:
 *     summary: Récupère une application cliente existante pour un locataire
 *     tags: [Configurations]
 *     parameters:
 *       - in: header
 *         name: X-Tenant-Id
 *         required: true
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
 *         description: Application cliente récupérée avec succès
 *       400:
 *         description: Echec de récupération de l'application cliente
 */

configurationsRoutes.get(
  "/apps/:tenantId/:appId",
  tenantProtectedActionsAuthToken,
  requireScope("app:read"),
  asyncHandler(getAppClientByIdQuery)
);

/**
 * @swagger
 * /config/apps/{tenantId}/{appId}/rotate-secret:
 *   post:
 *     summary: Régénère le secret d'une application et révoque les sessions de ses consumers
 *     tags: [Configurations]
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
 *         description: Nouveau secret (affiché une seule fois dans cette réponse)
 *       404:
 *         description: Application introuvable pour ce tenant
 */
configurationsRoutes.post(
  "/apps/:tenantId/:appId/rotate-secret",
  tenantProtectedActionsAuthToken,
  requireScope("app:update"),
  asyncHandler(rotateClientAppSecretHandler)
);

/**
 * @swagger
 * /config/apps/{tenantId}/{appId}/test-email:
 *   post:
 *     summary: Envoie au tenant connecté un e-mail d'exemple aux couleurs de l'application
 *     tags: [Configurations]
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
 *         description: E-mail envoyé ; data.to = adresse du tenant
 *       404:
 *         description: Application introuvable pour ce tenant
 *       429:
 *         description: Trop d'envois
 */
configurationsRoutes.post(
  "/apps/:tenantId/:appId/test-email",
  authRateLimiter,
  tenantProtectedActionsAuthToken,
  requireScope("app:update"),
  asyncHandler(sendTestEmailHandler)
);

export default configurationsRoutes;
