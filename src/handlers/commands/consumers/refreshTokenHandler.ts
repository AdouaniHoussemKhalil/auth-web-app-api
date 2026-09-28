import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { Consumer } from "../../../models/Consumer";
import { consumerTokenPayload } from "../../../services/token/payloads";
import {
  consumeRefreshToken,
  generateConsumerToken,
  verifyConsumerToken,
} from "../../../services/token/tokenService";

const invalidRefreshToken = () => {
  const error = new Error("Invalid or expired refresh token") as CustomError;
  error.status = 401;
  error.code = "invalidRefreshToken";
  return error;
};

// Échange un refresh token contre une nouvelle paire ; l'ancien refresh token devient inutilisable.
const refreshTokenHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const appClient = (request as any).appClient;
    const { refreshToken } = request.body;

    let decoded: any;
    try {
      decoded = await verifyConsumerToken(refreshToken, appClient.id, "refresh");
    } catch {
      throw invalidRefreshToken();
    }

    if (decoded.appId !== appClient.id || !(await consumeRefreshToken(decoded.jti))) {
      throw invalidRefreshToken();
    }

    const user = await Consumer.findOne({
      id: decoded.jwtPayload?.id,
      clientId: appClient.id,
      isActive: true,
    });
    if (!user) throw invalidRefreshToken();

    const tokens = await generateConsumerToken(
      { jwtPayload: consumerTokenPayload(user) },
      appClient.id,
      user.id
    );

    response.status(200).json({ ...tokens, isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default refreshTokenHandler;
