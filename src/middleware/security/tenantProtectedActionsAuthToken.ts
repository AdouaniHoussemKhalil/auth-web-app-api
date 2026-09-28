import { Request, Response, NextFunction } from "express";
import AppClient from "../../models/AppClient";
import { verifyTenantToken } from "../../services/token/tokenService";
import { createError } from "../error/errorHandler";

export const tenantProtectedActionsAuthToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(createError(401, "missingToken", "Missing or invalid Authorization header"));
  }

  const token = authHeader.split(" ")[1];

  const tenantId = req.headers["x-tenant-id"] as string;

  if (!tenantId) {
    return next(createError(400, "missingTenantId", "Missing X-Tenant-Id header"));
  }

  let decoded: any;
  try {
    decoded = await verifyTenantToken(token, tenantId, "access");
  } catch {
    return next(createError(403, "invalidToken", "Invalid or expired tenant token"));
  }

  // Un tenant n'agit que sur ses propres ressources.
  const targetTenantIds = [req.params.tenantId, req.body?.tenantId].filter(Boolean);
  if (targetTenantIds.some((id) => id !== tenantId)) {
    return next(createError(403, "forbiddenTenant", "Access to another tenant is forbidden"));
  }

  try {
    if (req.params.appId) {
      const ownsApp = await AppClient.exists({ id: req.params.appId, tenantId });
      if (!ownsApp) {
        return next(createError(404, "appNotFound", "App not found for this tenant"));
      }
    }
  } catch (err) {
    return next(err);
  }

  (req as any).tenant = decoded;
  next();
};
