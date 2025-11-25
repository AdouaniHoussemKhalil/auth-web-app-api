import jwt from "jsonwebtoken";
import crypto from "crypto";
import AppClient from "../../models/AppClient";
import { Tenant } from "../../models/Tenant";

const config = require("config");
const AUDIENCE = config.get("aud");

export const generateConsumerToken = async (
  payload: object,
  appId: string
): Promise<{ access_token: string; refresh_token: string }> => {
  const appClient = await AppClient.findOne({ id: appId, isActive: true });
  if (!appClient) throw new Error("Invalid or inactive App Client");

  const accessSecret = crypto
    .createHash("sha256")
    .update(appClient.secretKey + "_access")
    .digest("hex");

  const refreshSecret = crypto
    .createHash("sha256")
    .update(appClient.secretKey + "_refresh")
    .digest("hex");

  const accessExpiresIn = appClient.tokenExpiresIn || "1h";
  const refreshExpiresIn = appClient.resetTokenExpiresIn || "7d";

  const access_token = jwt.sign(
    { ...payload, appId, type: "access" },
    accessSecret,
    { expiresIn: accessExpiresIn, audience: appClient.name }
  );

  const refresh_token = jwt.sign(
    { ...payload, appId, type: "refresh" },
    refreshSecret,
    { expiresIn: refreshExpiresIn, audience: appClient.name }
  );

  return { access_token, refresh_token };
};

export const verifyConsumerToken = async (
  token: string,
  appId: string,
  type: "access" | "refresh" = "access"
): Promise<any> => {
  const appClient = await AppClient.findOne({ id: appId, isActive: true });
  if (!appClient)
    throw new Error("Invalid App Client for token verificationsss");

  const secret = crypto
    .createHash("sha256")
    .update(appClient.secretKey + (type === "access" ? "_access" : "_refresh"))
    .digest("hex");

  try {
    return jwt.verify(token, secret, { audience: appClient.name });
  } catch (err) {
    throw new Error("Invalid or expired user token");
  }
};

export const verifyTenantToken = async (
  token: string,
  tenantId: string,
  type: "access" | "refresh" = "access"
): Promise<any> => {
  const tenant = await Tenant.findOne({ id: tenantId, isActive: true });
  if (!tenant) throw new Error("Invalid or inactive tenant");

  const secret = crypto
    .createHash("sha256")
    .update(tenant.secretKey + (type === "access" ? "_access" : "_refresh"))
    .digest("hex");

  try {
    return jwt.verify(token, secret, { audience: AUDIENCE });
  } catch (err: any) {
    if (err.name === "TokenExpiredError") throw new Error("Token expired");
    throw new Error("Invalid token");
  }
};

export const generateTenantToken = async (
  payload: object,
  secretKey: string
): Promise<{ access_token: string; refresh_token: string }> => {
  const accessSecret = crypto
    .createHash("sha256")
    .update(secretKey + "_access")
    .digest("hex");

  const refreshSecret = crypto
    .createHash("sha256")
    .update(secretKey + "_refresh")
    .digest("hex");

  const access_token = jwt.sign({ ...payload, type: "access" }, accessSecret, {
    expiresIn: "1h",
    audience: "tenant2025",
  });

  const refresh_token = jwt.sign(
    { ...payload, type: "refresh" },
    refreshSecret,
    { expiresIn: "7d", audience: "tenant2025" }
  );
  return { access_token, refresh_token };
};
