import { Request, Response, NextFunction } from "express";
import { verifyTenantToken } from "../../services/token/tokenService";

export const tenantProtectedActionsAuthToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Missing or invalid Authorization header" });
    }

    const token = authHeader.split(" ")[1];

    const tenantId = req.headers["x-tenant-id"] as string;

    if (!tenantId) {
      return res.status(400).json({ message: "Missing tenantId" });
    }

    const decoded = await verifyTenantToken(token, tenantId, "access");

    console.log("Decoded tenant token:", decoded);

    (req as any).tenant = decoded;
    next();
  } catch (err) {
    console.error("Tenant token validation failed:", err);
    return res.status(403).json({ message: "Invalid or expired tenant token" });
  }
};
