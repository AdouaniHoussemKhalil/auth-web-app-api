import { Request, Response, NextFunction } from "express";
import { verifyConsumerToken } from "../../services/token/tokenService";
import { createError } from "../error/errorHandler";

export const consumerProtectedActionsAuthToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.header("Authorization");
  const appClient = (req as any).appClient;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(createError(401, "missingToken", "Missing or invalid Authorization header"));
  }

  // Erreur de configuration des routes : consumerActionsAuthToken doit précéder ce middleware.
  if (!appClient) {
    return next(new Error("consumerActionsAuthToken must run before this middleware"));
  }

  let decoded: any;
  try {
    const token = authHeader.split(" ")[1];
    decoded = await verifyConsumerToken(token, appClient.id, "access");
  } catch {
    return next(createError(403, "invalidToken", "Invalid or expired user token"));
  }

  // Un consumer n'agit que sur son propre compte, quel que soit l'identifiant transmis.
  const currentUser = decoded.jwtPayload ?? {};
  const targetsOtherUser =
    decoded.appId !== appClient.id ||
    [req.params.id, req.body?.userId].some((id) => id && id !== currentUser.id) ||
    (req.body?.email && req.body.email.toLowerCase() !== currentUser.email?.toLowerCase());

  if (targetsOtherUser) {
    return next(createError(403, "forbiddenUser", "Access to another user is forbidden"));
  }

  (req as any).user = decoded;
  next();
};
