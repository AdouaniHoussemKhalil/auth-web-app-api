import { NextFunction, Request, Response } from "express";
import {
  revokeAllRefreshTokens,
  revokeRefreshToken,
  verifyConsumerToken,
} from "../../../services/token/tokenService";

// Révoque le refresh token (ou toutes les sessions avec allDevices). Idempotent : répond 200 dans tous les cas.
const logoutHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const appClient = (request as any).appClient;
    const { refreshToken, allDevices } = request.body;

    const decoded = await verifyConsumerToken(refreshToken, appClient.id, "refresh").catch(
      () => null
    );

    if (decoded?.appId === appClient.id) {
      if (allDevices) {
        await revokeAllRefreshTokens("consumer", decoded.jwtPayload?.id, appClient.id);
      } else {
        await revokeRefreshToken(decoded.jti);
      }
    }

    response.status(200).json({ message: "Logged out", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default logoutHandler;
