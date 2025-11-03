import { Router } from "express";
import { consumerActionsAuthToken } from "../../middleware/security/consumerActionsAuthToken";
import validate from "../../middleware/validation/validateSchema";
import { registerSchema } from "../../validation/users/registerSchema";
import registerHandler from "../../handlers/tenants/registerHandler";
import { asyncHandler } from ".";
import { loginSchema } from "../../validation/users/loginSchema";
import loginUserHandler from "../../handlers/consumers/loginUserHandler";
import { forgotPasswordSchema } from "../../validation/users/forgotPasswordSchema";
import forgotPasswordHandler from "../../handlers/consumers/forgotPasswordHandler";
import { verifyResetCodeSchema } from "../../validation/users/verifyResetCodeSchema";
import verifyResetCodeHandler from "../../handlers/consumers/verifyResetCodeHandler";
import { resetPasswordSchema } from "../../validation/users/resetPasswordSchema";
import resetPasswordHandler from "../../handlers/consumers/resetPasswordHandler";
import { updatePasswordSchema } from "../../validation/users/updatePasswordSchema";
import { consumerProtectedActionsAuthToken } from "../../middleware/security/consumerProtectedActionsAuthToken";
import { updateProfileSchema } from "../../validation/users/updateProfileSchema";
import updatePasswordHandler from "../../handlers/consumers/updatePasswordHandler";
import { activatedMFASchema } from "../../validation/users/activatedMFASchema";
import activateMFAHandler from "../../handlers/consumers/activateMFAHandler";
import { deactivateMFASchema } from "../../validation/users/deactivateMFASchema";
import deactivateMFAHandler from "../../handlers/consumers/deactivateMFAHandler";
import { loginByCodeMFASchema } from "../../validation/users/loginByCodeMFASchema";
import loginByCodeMFAHandler from "../../handlers/consumers/loginByCodeMFAHandler";
import { requestMFASchema } from "../../validation/users/requestMFASchema";
import requestMFAHandler from "../../handlers/consumers/requestMFAHandler";


const consumersRoutes = Router();

consumersRoutes.use(consumerActionsAuthToken);

/* ============================
   AUTH ROUTES (/auth/*)
============================ */

// Register
consumersRoutes.post(
  "/auth/register",
  validate(registerSchema),
  asyncHandler(registerHandler)
);

// Login
consumersRoutes.post(
  "/auth/login",
  validate(loginSchema),
  asyncHandler(loginUserHandler)
);

// Forgot password
consumersRoutes.post(
  "/auth/forgotPassword",
  validate(forgotPasswordSchema),
  asyncHandler(forgotPasswordHandler)
);

// Verify reset code
consumersRoutes.post(
  "/auth/verifyResetCode",
  validate(verifyResetCodeSchema),
  asyncHandler(verifyResetCodeHandler)
);

// Reset password
consumersRoutes.put(
  "/auth/resetPassword",
  validate(resetPasswordSchema),
  asyncHandler(resetPasswordHandler) 
);

// Update profile
consumersRoutes.put(
  "/auth/updateProfile",
  validate(updateProfileSchema),
  consumerProtectedActionsAuthToken,
  asyncHandler(updatePasswordHandler)
);

// Update password
consumersRoutes.put(
  "/auth/updatePassword",
  validate(updatePasswordSchema),
  consumerProtectedActionsAuthToken,
  asyncHandler(updatePasswordHandler)
);

// Activate MFA
consumersRoutes.post(
  "/auth/activateMFA",
  validate(activatedMFASchema),
  consumerProtectedActionsAuthToken,
  asyncHandler(activateMFAHandler)
);

// Deactivate MFA
consumersRoutes.post(
  "/auth/deactivateMFA",
  validate(deactivateMFASchema),
  consumerProtectedActionsAuthToken,
  asyncHandler(deactivateMFAHandler)
);

// Login by MFA code
consumersRoutes.post(
  "/auth/loginByCodeMFA",
  validate(loginByCodeMFASchema),
  asyncHandler(loginByCodeMFAHandler)
);

// Request MFA
consumersRoutes.post(
  "/auth/mfaRequest",
  validate(requestMFASchema),
  consumerProtectedActionsAuthToken,
  asyncHandler(requestMFAHandler) 
);

export default consumersRoutes;
