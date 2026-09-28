import { Request, Response, NextFunction } from "express";
import AppClient from "../../models/AppClient";
import { safeEqual } from "../../services/security/oneTimeCode";

export const consumerActionsAuthToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appId = req.headers["x-app-id"] as string;
    const appSecret = req.headers["x-app-secret"] as string;

    if (!appId || !appSecret) {
      return res.status(400).json({
        message: "Missing x-app-id or x-app-secret header",
        isSuccess: false,
      });
    }

    const appClient = await AppClient.findOne({ id: appId, isActive: true });

    // Même message dans les deux cas pour ne pas révéler quels identifiants d'application existent.
    if (!appClient || !safeEqual(appClient.secretKey, appSecret)) {
      return res.status(403).json({
        message: "Invalid or inactive app client",
        isSuccess: false,
      });
    }

    (req as any).appClient = appClient;

    next();
  } catch (err) {
    console.error("App client authentication error:", err);
    res.status(500).json({ message: "Server error", isSuccess: false });
  }
};
