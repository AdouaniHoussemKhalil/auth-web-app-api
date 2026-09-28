import { Request, Response, NextFunction } from "express";
import { Tenant } from "../../../models/Tenant";
import { CustomError } from "../../../middleware/error/errorHandler";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { generateTenantToken } from "../../../services/token/tokenService";
import { consumeOneTimeCode } from "../../../services/security/oneTimeCode";

const loginByMFACodeHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { email, mfaCode } = request.body;

    const tenant = await Tenant.findOne({ email });
    if (!tenant) {
      const error = new Error("Invalid code") as CustomError;
      error.status = 400;
      error.code = "invalidCode";
      throw error;
    }

    await consumeOneTimeCode(tenant, SecondaryUserAccessMethodType.MFA, mfaCode);

    const result: any = {
      tenantId: tenant.id,
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      role: tenant.role,
      scopes: tenant.scopes,
    };

    const { access_token, refresh_token } = await generateTenantToken(
      { jwtPayload: result },
      tenant.secretKey
    );

    response.status(200).json({
      result,
      access_token,
      refresh_token,
      message: "MFA verified successfully",
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default loginByMFACodeHandler;
