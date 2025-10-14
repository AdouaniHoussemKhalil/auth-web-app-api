// import { Request, Response, NextFunction } from "express";
// import jwt, { Secret } from "jsonwebtoken";
// import config from "config";

// const secretKey : Secret = config.get("authentification.SECRET_TOKEN");

// const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ message: "Token missing. Authentication required." });
//   }

//   jwt.verify(token, secretKey, (err: any, user: any) => {
//     if (err) {
//       return res.status(403).json({ message: "Invalid token. Access denied." });
//     }
//     next();
//   });
// };

// export default authenticateToken;


import { Request, Response, NextFunction } from "express";
import { verifyUserToken } from "../../services/token/tokenService";

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
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
    const decoded = await verifyUserToken(token, appClient.appId);

    (req as any).user = decoded;
    next();
  } catch (err) {
    console.error("User token validation failed:", err);
    return res.status(403).json({ message: "Invalid or expired user token" });
  }
};
