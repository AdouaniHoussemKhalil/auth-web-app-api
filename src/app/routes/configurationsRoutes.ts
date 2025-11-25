import { Router } from "express";
import validate from "../../middleware/validation/validateSchema";
import { asyncHandler } from ".";
import { createClientAppSchema } from "../../validation/configurations/createClientAppSchema";
import createClientAppHandler from "../../handlers/commands/configurations/createClientAppHandler";
import { tenantProtectedActionsAuthToken } from "../../middleware/security/tenantProtectedActionsAuthToken";
import updateClientAppHandler from "../../handlers/commands/configurations/updateClientAppHandler";
import { updateClientAppSchema } from "../../validation/configurations/updateClientAppSchema";
import getAppClientsQuery from "../../handlers/queries/configurations/getAppClientsQuery";
import getAppClientByIdQuery from "../../handlers/queries/configurations/getAppClientByIdQuery";

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
 *     responses:
 *       200:
 *         description: Applications clientes récupérées avec succès
 *       400:
 *         description: Echec de récupération des applications clientes
 */

configurationsRoutes.get(
  "/apps/:tenantId",
  tenantProtectedActionsAuthToken,
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
  asyncHandler(getAppClientByIdQuery)
)

export default configurationsRoutes;