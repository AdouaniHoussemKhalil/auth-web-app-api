import { NextFunction, Request, Response } from "express";
import { createError } from "../../../middleware/error/errorHandler";
import { Tenant } from "../../../models/Tenant";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { consumeOneTimeCode } from "../../../services/security/oneTimeCode";
import { tenantTokenPayload } from "../../../services/token/payloads";
import { generateTenantToken } from "../../../services/token/tokenService";

/**
 * Vérifie l'adresse e-mail avec le code reçu à l'inscription et ouvre une session :
 * la possession de l'e-mail vient d'être prouvée, inutile d'imposer une connexion avec un second code.
 */
const verifyEmailHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { email, code } = request.body;

    const tenant = await Tenant.findOne({ email, isActive: true });
    if (!tenant || tenant.isEmailVerified) throw createError(400, "invalidCode", "Invalid code");

    await consumeOneTimeCode(tenant, SecondaryUserAccessMethodType.EmailVerification, code);
    tenant.isEmailVerified = true;
    await tenant.save();

    const user = tenantTokenPayload(tenant);
    const tokens = await generateTenantToken({ jwtPayload: user }, tenant.secretKey, tenant.id);

    response.status(200).json({ message: "Email verified", user, ...tokens, isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default verifyEmailHandler;
