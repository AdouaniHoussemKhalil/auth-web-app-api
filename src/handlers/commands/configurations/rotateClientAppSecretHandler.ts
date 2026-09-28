import { NextFunction, Request, Response } from "express";
import AppClient from "../../../models/AppClient";
import { CustomError } from "../../../middleware/error/errorHandler";
import { revokeAllRefreshTokens } from "../../../services/token/tokenService";
import { generateAppSecret } from "../../../utils/random";

/**
 * Remplace le secret d'une application (par exemple après une fuite).
 * Les tokens des consumers étant signés avec ce secret, toutes leurs sessions sont invalidées.
 */
const rotateClientAppSecretHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, appId } = req.params;

    const app = await AppClient.findOne({ id: appId, tenantId });
    if (!app) {
      const error = new Error("App not found for this tenant") as CustomError;
      error.status = 404;
      error.code = "appNotFound";
      throw error;
    }

    app.secretKey = generateAppSecret();
    await app.save();
    await revokeAllRefreshTokens("consumer", undefined, app.id);

    return res.status(200).json({
      message: "App secret rotated, existing consumer sessions have been revoked",
      data: { appId: app.id, secretKey: app.secretKey },
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default rotateClientAppSecretHandler;
