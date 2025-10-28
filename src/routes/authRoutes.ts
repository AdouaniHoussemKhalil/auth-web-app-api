import { Router } from "express";
import validate from "../middleware/validation/validateSchema";
import { registerSchema } from "../schemas/authentication/registerSchema";
import { asyncHandler } from "../utils/asyncHandler";
import registerUserHandler from "../handlers/authentification/registerUserHandler";
import { loginSchema } from "../schemas/authentication/loginSchema";
import loginUserHandler from "../handlers/authentification/loginUserHandler";
import {
  forgotPasswordSchema,
  verifyResetCodeSchema,
} from "../schemas/authentication/forgotPasswordSchema";
import forgotPasswordHandler from "../handlers/authentification/forgotPasswordHandler";
import verifyResetCodeHandler from "../handlers/authentification/verifyResetCodeHandler";
import { resetPasswordSchema } from "../schemas/authentication/resetPasswordSchema";
import resetPasswordHandler from "../handlers/authentification/resetPasswordHandler";
import { authenticateToken } from "../middleware/security/authenticateToken";
import { updateProfileSchema } from "../schemas/authentication/updateProfileSchema";
import updateProfileHandler from "../handlers/authentification/updateProfileHandler";
import updatePasswordHandler from "../handlers/authentification/updatePasswordHandler";
import { updatePasswordSchema } from "../schemas/authentication/updatePasswordSchema";
import activateMFAHandler from "../handlers/authentification/activateMFAHandler";
import loginByCodeMFAHandler from "../handlers/authentification/loginByCodeMFAHandler";
import { loginByCodeMFASchema } from "../schemas/authentication/loginByCodeMFASchema";
import { activatedMFASchema } from "../schemas/authentication/activatedMFASchema";
import { deactivateMFASchema } from "../schemas/authentication/deactivateMFASchema";
import deactivateMFAHandler from "../handlers/authentification/deactivateMFAHandler";
import { requestMFASchema } from "../schemas/authentication/requestMFASchema";
import { authenticateAppClient } from "../middleware/security/authenticateAppClient";
import requestMFAHandler from "../handlers/authentification/requestMFAHandler";

const authRoutes = Router();

authRoutes.use(authenticateAppClient);

authRoutes.post(
  "/register",
  validate(registerSchema),
  asyncHandler(registerUserHandler)
);

authRoutes.post(
  "/login",
  validate(loginSchema),
  asyncHandler(loginUserHandler)
);

authRoutes.post(
  "/forgotPassword",
  validate(forgotPasswordSchema),
  asyncHandler(forgotPasswordHandler)
);

authRoutes.post(
  "/verifyResetCode",
  validate(verifyResetCodeSchema),
  asyncHandler(verifyResetCodeHandler)
);

authRoutes.put(
  "/resetPassword",
  validate(resetPasswordSchema),
  asyncHandler(resetPasswordHandler)
);

authRoutes.put(
  "/updateProfile",
  validate(updateProfileSchema),
  authenticateToken,
  asyncHandler(updateProfileHandler)
);

authRoutes.put(
  "/updatePassword",
  validate(updatePasswordSchema),
  authenticateToken,
  asyncHandler(updatePasswordHandler)
);

authRoutes.post(
  "/activateMFA",
  validate(activatedMFASchema),
  authenticateToken,
  asyncHandler(activateMFAHandler)
);

authRoutes.post(
  "/deactivateMFA",
  validate(deactivateMFASchema),
  authenticateToken,
  asyncHandler(deactivateMFAHandler)
);

authRoutes.post(
  "/loginByCodeMFA",
  validate(loginByCodeMFASchema),
  asyncHandler(loginByCodeMFAHandler)
);

authRoutes.post(
  "/mfaRequest",
  validate(requestMFASchema),
  authenticateToken,
  asyncHandler(requestMFAHandler)
);


export default authRoutes;
