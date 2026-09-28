import { Request, Response, NextFunction } from "express";
import AppClient from "../../models/AppClient";
import { verifyTenantToken } from "../../services/token/tokenService";

export const tenantProtectedActionsAuthToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  const tenantId = req.headers["x-tenant-id"] as string;

  if (!tenantId) {
    return res.status(400).json({ message: "Missing tenantId" });
  }

  let decoded: any;
  try {
    decoded = await verifyTenantToken(token, tenantId, "access");
  } catch (err) {
    console.error("Tenant token validation failed:", err);
    return res.status(403).json({ message: "Invalid or expired tenant token" });
  }

  // Un tenant n'agit que sur ses propres ressources.
  const targetTenantIds = [req.params.tenantId, req.body?.tenantId].filter(Boolean);
  if (targetTenantIds.some((id) => id !== tenantId)) {
    return res.status(403).json({ message: "Access to another tenant is forbidden" });
  }

  try {
    if (req.params.appId) {
      const ownsApp = await AppClient.exists({ id: req.params.appId, tenantId });
      if (!ownsApp) {
        return res.status(404).json({ message: "App not found for this tenant" });
      }
    }
  } catch (err) {
    return next(err);
  }

  (req as any).tenant = decoded;
  next();
};
