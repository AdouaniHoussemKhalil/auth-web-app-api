import { Request, Response, NextFunction } from "express";
import AppClient from "../../models/AppClient";
import { safeEqual } from "../../services/security/oneTimeCode";
import { createError } from "../error/errorHandler";

export const consumerActionsAuthToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const appId = req.headers["x-app-id"] as string;
    const appSecret = req.headers["x-app-secret"] as string;

    if (!appId || !appSecret) {
      return next(
        createError(400, "missingAppCredentials", "Missing x-app-id or x-app-secret header")
      );
    }

    const appClient = await AppClient.findOne({ id: appId, isActive: true });

    // Même message dans les deux cas pour ne pas révéler quels identifiants d'application existent.
    if (!appClient || !safeEqual(appClient.secretKey, appSecret)) {
      return next(createError(403, "invalidAppClient", "Invalid or inactive app client"));
    }

    (req as any).appClient = appClient;

    next();
  } catch (error) {
    next(error);
  }
};
