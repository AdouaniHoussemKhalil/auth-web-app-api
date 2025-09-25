import { Router } from "express";
import validate from "../middleware/validation/validateSchema";
import { registerSchema } from "../schemas/registerSchema";
import { asyncHandler } from "../utils/asyncHandler";
import registerUserHandler from "../handlers/authentification/registerUserHandler";
import { loginSchema } from "../schemas/loginSchema";
import loginUserHandler from "../handlers/authentification/loginUserHandler";
import { forgotPasswordSchema, verifyResetCodeSchema } from "../schemas/forgotPasswordSchema";
import forgotPasswordHandler from "../handlers/authentification/forgotPasswordHandler";
import verifyResetCodeHandler from "../handlers/authentification/verifyResetCodeHandler";
import { resetPasswordSchema } from "../schemas/resetPasswordSchema";
import resetPasswordHandler from "../handlers/authentification/resetPasswordHandler";
import authenticateToken from "../middleware/security/authenticateToken";
import { updateProfileSchema } from "../schemas/updateProfileSchema";
import updateProfileHandler from "../handlers/authentification/updateProfileHandler";
import updatePasswordHandler from "../handlers/authentification/updatePasswordHandler";
import { updatePasswordSchema } from "../schemas/updatePasswordSchema";

const authRoutes = Router();

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
)

authRoutes.post(
    "/verifyResetCode",
    validate(verifyResetCodeSchema),
    asyncHandler(verifyResetCodeHandler)
)

authRoutes.put(
    "/resetPassword",
    validate(resetPasswordSchema),
    asyncHandler(resetPasswordHandler)
)

authRoutes.put(
    "/updateProfile",
    validate(updateProfileSchema),
    authenticateToken,
    asyncHandler(updateProfileHandler)
)

authRoutes.put(
    "/updatePassword",
    validate(updatePasswordSchema),
    authenticateToken,
    asyncHandler(updatePasswordHandler)
)

export default authRoutes;
