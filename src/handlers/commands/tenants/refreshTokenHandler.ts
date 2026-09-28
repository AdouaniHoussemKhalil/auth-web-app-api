import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { CustomError } from "../../../middleware/error/errorHandler";
import { Tenant } from "../../../models/Tenant";
import { tenantTokenPayload } from "../../../services/token/payloads";
import {
  consumeRefreshToken,
  generateTenantToken,
  verifyTenantToken,
} from "../../../services/token/tokenService";

const invalidRefreshToken = () => {
  const error = new Error("Invalid or expired refresh token") as CustomError;
  error.status = 401;
  error.code = "invalidRefreshToken";
  return error;
};

// Le tenantId est lu dans le token (non vérifié) uniquement pour retrouver la clé de vérification.
export const tenantIdOf = (token: string): string | undefined =>
  (jwt.decode(token) as any)?.jwtPayload?.tenantId;

const refreshTokenHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { refreshToken } = request.body;
    const tenantId = tenantIdOf(refreshToken);
    if (!tenantId) throw invalidRefreshToken();

    let decoded: any;
    try {
      decoded = await verifyTenantToken(refreshToken, tenantId, "refresh");
    } catch {
      throw invalidRefreshToken();
    }

    if (!(await consumeRefreshToken(decoded.jti))) throw invalidRefreshToken();

    const tenant = await Tenant.findOne({ id: tenantId, isActive: true });
    if (!tenant) throw invalidRefreshToken();

    const tokens = await generateTenantToken(
      { jwtPayload: tenantTokenPayload(tenant) },
      tenant.secretKey,
      tenant.id
    );

    response.status(200).json({ ...tokens, isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default refreshTokenHandler;
