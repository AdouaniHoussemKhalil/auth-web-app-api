import { Router } from "express";
import validate from "../../middleware/validation/validateSchema";
import { asyncHandler } from ".";
import { createClientAppSchema } from "../../validation/configurations/createClientAppSchema";
import createClientAppHandler from "../../handlers/configurations/createClientAppHandler";

const configurationsRoutes = Router();

configurationsRoutes.post(
  "/config/apps/create",
  validate(createClientAppSchema),
  asyncHandler(createClientAppHandler)
);

export default configurationsRoutes;