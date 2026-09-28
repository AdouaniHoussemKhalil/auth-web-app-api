import { Request, Response, NextFunction } from "express";
import { verifyConsumerToken } from "../../services/token/tokenService";

export const consumerProtectedActionsAuthToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.header("Authorization");
  const appClient = (req as any).appClient;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  if (!appClient) {
    return res.status(400).json({ message: "App client not initialized" });
  }

  let decoded: any;
  try {
    const token = authHeader.split(" ")[1];
    decoded = await verifyConsumerToken(token, appClient.id, "access");
  } catch (err) {
    console.error("User token validation failed:", err);
    return res.status(403).json({ message: "Invalid or expired user token" });
  }

  // Un consumer n'agit que sur son propre compte, quel que soit l'identifiant transmis.
  const currentUser = decoded.jwtPayload ?? {};
  const targetsOtherUser =
    decoded.appId !== appClient.id ||
    [req.params.id, req.body?.userId].some((id) => id && id !== currentUser.id) ||
    (req.body?.email && req.body.email.toLowerCase() !== currentUser.email?.toLowerCase());

  if (targetsOtherUser) {
    return res.status(403).json({ message: "Access to another user is forbidden" });
  }

  (req as any).user = decoded;
  next();
};
