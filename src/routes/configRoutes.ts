import { Router } from "express";
import { AppClientSchema } from "../schemas/configuration/appClientSchema";
import validate from "../middleware/validation/validateSchema";
import { asyncHandler } from "../utils/asyncHandler";
import createAppClientHandler from "../handlers/configuration/createAppClientHandler";


const configRoutes = Router();

configRoutes.post(
    "/createAppClient",
    validate(AppClientSchema),
    asyncHandler(createAppClientHandler)
)

export default configRoutes;