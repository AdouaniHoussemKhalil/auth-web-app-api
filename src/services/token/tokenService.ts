import jwt from "jsonwebtoken";
import AppClient from "../../models/AppClient";

export const generateUserToken = async (payload: object, appId: string): Promise<string> => {
  const appClient = await AppClient.findOne({ appId, isActive: true });
  if (!appClient) throw new Error("Invalid or inactive App Client");

  return jwt.sign(
    { ...payload, appId },
    appClient.secretKey,
    { expiresIn: appClient.tokenExpiresIn || "1h", audience: appClient.name }
  );
};

export const verifyUserToken = async (token: string, appId: string): Promise<any> => {
  const appClient = await AppClient.findOne({ appId, isActive: true });
  if (!appClient) throw new Error("Invalid App Client for token verification");

  try {
    return jwt.verify(token, appClient.secretKey);
  } catch (err) {
    throw new Error("Invalid or expired user token");
  }
};

export const generateResetPasswordToken = async (payload: object, appId: string): Promise<string> => {
  const appClient = await AppClient.findOne({ appId, isActive: true });
  if (!appClient) throw new Error("Invalid or inactive App Client");

  return jwt.sign(
    { ...payload, appId },
    appClient.secretKey,
    { expiresIn: appClient.tokenExpiresIn || "1h", audience: appClient.name }
  );
};