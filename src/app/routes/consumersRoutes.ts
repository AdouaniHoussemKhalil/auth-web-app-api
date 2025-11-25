import { Router } from "express";
import { consumerActionsAuthToken } from "../../middleware/security/consumerActionsAuthToken";
import validate from "../../middleware/validation/validateSchema";
import { registerSchema } from "../../validation/users/registerSchema";
import registerHandler from "../../handlers/commands/tenants/registerHandler";
import { asyncHandler } from ".";
import { loginSchema } from "../../validation/users/loginSchema";
import loginUserHandler from "../../handlers/commands/consumers/loginUserHandler";
import { forgotPasswordSchema } from "../../validation/users/forgotPasswordSchema";
import forgotPasswordHandler from "../../handlers/commands/consumers/forgotPasswordHandler";
import { verifyResetCodeSchema } from "../../validation/users/verifyResetCodeSchema";
import verifyResetCodeHandler from "../../handlers/commands/consumers/verifyResetCodeHandler";
import { resetPasswordSchema } from "../../validation/users/resetPasswordSchema";
import resetPasswordHandler from "../../handlers/commands/consumers/resetPasswordHandler";
import { updatePasswordSchema } from "../../validation/users/updatePasswordSchema";
import { consumerProtectedActionsAuthToken } from "../../middleware/security/consumerProtectedActionsAuthToken";
import { updateProfileSchema } from "../../validation/users/updateProfileSchema";
import updatePasswordHandler from "../../handlers/commands/consumers/updatePasswordHandler";
import { activatedMFASchema } from "../../validation/users/activatedMFASchema";
import activateMFAHandler from "../../handlers/commands/consumers/activateMFAHandler";
import { deactivateMFASchema } from "../../validation/users/deactivateMFASchema";
import deactivateMFAHandler from "../../handlers/commands/consumers/deactivateMFAHandler";
import { loginByCodeMFASchema } from "../../validation/users/loginByCodeMFASchema";
import loginByCodeMFAHandler from "../../handlers/commands/consumers/loginByCodeMFAHandler";
import { requestMFASchema } from "../../validation/users/requestMFASchema";
import requestMFAHandler from "../../handlers/commands/consumers/requestMFAHandler";
import updateProfileHandler from "../../handlers/commands/consumers/updateProfileHandler";
import getConsumerDetailsByIdQuery from "../../handlers/queries/consumers/getConsumerDetailsByIdQuery";
import registerUserHandler from "../../handlers/commands/consumers/registerUserHandler";

const consumersRoutes = Router();

consumersRoutes.use(consumerActionsAuthToken);

/**
 * @swagger
 * /consumers/auth/register:
 *   post:
 *     summary: Enregistre un nouvel utilisateur
 *     tags: [Consumers Authentication]
 *     parameters:
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-app-secret
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/ConsumerRegister'
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Données invalides
 */
consumersRoutes.post(
  "/auth/register",
  validate(registerSchema),
  asyncHandler(registerUserHandler)
);

/**
 * @swagger
 * /consumers/auth/login:
 *   post:
 *     summary: Authentifie un utilisateur et retourne un token JWT
 *     tags: [Consumers Authentication]
 *     parameters:
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-app-secret
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerLogin'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       401:
 *         description: Identifiants invalides
 */
consumersRoutes.post(
  "/auth/login",
  validate(loginSchema),
  asyncHandler(loginUserHandler)
);

/**
 * @swagger
 * /consumers/auth/forgotPassword:
 *   post:
 *     summary: Demande un code de réinitialisation de mot de passe au cas d'oubli
 *     tags: [Consumers Authentication]
 *     parameters:
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-app-secret
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerForgotPassword'
 *     responses:
 *       200:
 *         description: Génération du code de réinitialisation réussie
 *       401:
 *         description: Génération du code de réinitialisation échouée
 */

// Forgot password
consumersRoutes.post(
  "/auth/forgotPassword",
  validate(forgotPasswordSchema),
  asyncHandler(forgotPasswordHandler)
);

/**
 * @swagger
 * /auth/verifyResetPasswordCode:
 *   post:
 *     summary: Vérifie le code de réinitialisation de mot de passe
 *     tags: [Consumers Authentication]
 *     parameters:
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-app-secret
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerVerifyResetPasswordCode'
 *     responses:
 *       200:
 *         description: Vérification du code de réinitialisation réussie
 *       401:
 *         description: Vérification du code de réinitialisation échouée
 */

// Verify reset code
consumersRoutes.post(
  "/auth/verifyResetCode",
  validate(verifyResetCodeSchema),
  asyncHandler(verifyResetCodeHandler)
);

/**
 * @swagger
 * /auth/resetPassword:
 *   put:
 *     summary: Réinitialise le mot de passe d'un utilisateur
 *     tags: [Consumers Authentication]
 *     parameters:
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-app-secret
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerResetPassword'
 *     responses:
 *       200:
 *         description: Réinitialisation du mot de passe réussie
 *       401:
 *         description: Réinitialisation du mot de passe échouée
 */

// Reset password
consumersRoutes.put(
  "/auth/resetPassword",
  validate(resetPasswordSchema),
  consumerActionsAuthToken,
  asyncHandler(resetPasswordHandler)
);

/**
 * @swagger
 * /consumers/auth/updateProfile/{id}:
 *   put:
 *     summary: Met à jour le profil d'un utilisateur
 *     tags: [Consumers Authentication]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-app-secret
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerUpdateProfile'
 *     responses:
 *       200:
 *         description: Mise à jour du profil réussie
 *       401:
 *         description: Mise à jour du profil échouée
 */

// Update profile
consumersRoutes.put(
  "/auth/updateProfile/:id",
  validate(updateProfileSchema),
  consumerActionsAuthToken,
  consumerProtectedActionsAuthToken,
  asyncHandler(updateProfileHandler)
);

/**
 * @swagger
 * /consumers/auth/updatePassword/{id}:
 *   put:
 *     summary: Met à jour le mot de passe d'un utilisateur
 *     tags: [Consumers Authentication]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-app-secret
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerUpdatePassword'
 *     responses:
 *       200:
 *         description: Mise à jour du mot de passe réussie
 *       401:
 *         description: Mise à jour du mot de passe échouée
 */

// Update password
consumersRoutes.put(
  "/auth/updatePassword/:id",
  validate(updatePasswordSchema),
  consumerProtectedActionsAuthToken,
  asyncHandler(updatePasswordHandler)
);

/**
 * @swagger
 * /consumers/auth/activateMFA:
 *   post:
 *     summary: Active la vérification en deux étapes (MFA) pour un utilisateur
 *     tags: [Consumers Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerActivateMFA'
 *     parameters:
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-app-secret
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activation de la vérification en deux étapes réussie
 *       401:
 *         description: Activation de la vérification en deux étapes échouée
 */

// Activate MFA
consumersRoutes.post(
  "/auth/activateMFA",
  validate(activatedMFASchema),
  consumerProtectedActionsAuthToken,
  asyncHandler(activateMFAHandler)
);

/**
 * @swagger
 * /consumers/auth/deactivateMFA:
 *   post:
 *     summary: Désactive la vérification en deux étapes (MFA) pour un utilisateur
 *     tags: [Consumers Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerDeactivateMFA'
 *     parameters:
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-app-secret
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Désactivation de la vérification en deux étapes réussie
 *       401:
 *         description: Désactivation de la vérification en deux étapes échouée
 */

// Deactivate MFA
consumersRoutes.post(
  "/auth/deactivateMFA",
  validate(deactivateMFASchema),
  consumerProtectedActionsAuthToken,
  asyncHandler(deactivateMFAHandler)
);

/**
 * @swagger
 * /consumers/auth/loginByMFA:
 *   post:
 *     summary: Connecte un utilisateur en utilisant la vérification en deux étapes (MFA)
 *     tags: [Consumers Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerLoginByMFA'
 *     parameters:
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-app-secret
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       401:
 *         description: Échec de la connexion
 */

// Login by MFA code
consumersRoutes.post(
  "/auth/loginByMFA",
  validate(loginByCodeMFASchema),
  asyncHandler(loginByCodeMFAHandler)
);

/**
 * @swagger
 * /consumers/auth/requestMFA:
 *   post:
 *     summary: Demander l'activation ou la désactivation de la vérification en deux étapes (MFA)
 *     tags: [Consumers Authentication]
 *     parameters:
 *      - in: header
 *        name: x-app-id
 *        required: true
 *        schema:
 *          type: string
 *      - in: header
 *        name: x-app-secret
 *        required: true
 *        schema:
 *          type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerRequestMFA'
 *     responses:
 *       200:
 *         description: Demande MFA réussie
 *       401:
 *         description: Échec de la demande MFA
 */

// Request MFA
consumersRoutes.post(
  "/auth/requestMFA",
  validate(requestMFASchema),
  consumerProtectedActionsAuthToken,
  asyncHandler(requestMFAHandler)
);


/**
 * @swagger
 * /consumers/auth/me/{id}:
 *   get:
 *     summary: Demander les détails du consommateur par ID
 *     tags: [Consumers Authentication]
 *     parameters:
 *      - in: path
 *        name: id
 *        required: true
 *        schema:
 *           type: string
 *      - in: header
 *        name: x-app-id
 *        required: true
 *        schema:
 *          type: string
 *      - in: header
 *        name: x-app-secret
 *        required: true
 *        schema:
 *          type: string
 *     responses:
 *       200:
 *         description: Récuperation réussie
 *       401:
 *         description: Échec de la récupération
 */

consumersRoutes.get(
  "/auth/me/:id",
  consumerProtectedActionsAuthToken,
  asyncHandler(getConsumerDetailsByIdQuery)
);

export default consumersRoutes;
