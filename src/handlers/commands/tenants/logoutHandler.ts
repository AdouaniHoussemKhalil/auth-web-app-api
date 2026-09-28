import { NextFunction, Request, Response } from "express";
import {
  revokeAllRefreshTokens,
  revokeRefreshToken,
  verifyTenantToken,
} from "../../../services/token/tokenService";
import { tenantIdOf } from "./refreshTokenHandler";

// Révoque le refresh token (ou toutes les sessions avec allDevices). Idempotent : répond 200 dans tous les cas.
const logoutHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { refreshToken, allDevices } = request.body;
    const tenantId = tenantIdOf(refreshToken);

    const decoded = tenantId
      ? await verifyTenantToken(refreshToken, tenantId, "refresh").catch(() => null)
      : null;

    if (decoded) {
      if (allDevices) {
        await revokeAllRefreshTokens("tenant", tenantId);
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
