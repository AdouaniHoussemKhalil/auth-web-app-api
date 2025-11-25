import { Request, Response, NextFunction } from "express";
import { verifyConsumerToken } from "../../services/token/tokenService";

export const consumerProtectedActionsAuthToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header("Authorization");
    const appClient = (req as any).appClient;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }

    if (!appClient) {
      return res.status(400).json({ message: "App client not initialized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await verifyConsumerToken(token, appClient.id, "access");

    (req as any).user = decoded;
    next();
  } catch (err) {
    console.error("User token validation failed:", err);
    return res.status(403).json({ message: "Invalid or expired user token" });
  }
};

