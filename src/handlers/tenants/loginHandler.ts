import { Response, Request, NextFunction } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import { Tenant } from "../../models/Tenant";
import { compare, hash } from "../../services/hashing/hash";
import { randomSixDigitCode } from "../../utils/random";
import { SecondaryUserAccessMethodType } from "../../models/subdocuments/SecondaryAccessMethod";
import { generateTenantToken } from "../../services/token/tokenService";
import { Recipient } from "../../services/email/models/Recipient";
import { templates } from "../../services/email/models/Template";
import sendTemplateEmail from "../../services/email/sendMails";

const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      const error = new Error("Missing required fields") as CustomError;
      error.status = 400;
      throw error;
    }

    const tenant = await Tenant.findOne({ email });
    if (!tenant) {
      const error = new Error("Invalid email or password") as CustomError;
      error.status = 401;
      error.code = "invalidCredentials";
      throw error;
    }

    const isPasswordValid = await compare(password, tenant.password);

    if (!isPasswordValid) {
      const error = new Error("Invalid email or password") as CustomError;
      error.status = 401;
      error.code = "invalidCredentials";
      throw error;
    }

    if (!tenant.isActive || !tenant.isMFAActivated) {
      const error = new Error("User is blocked") as CustomError;
      error.status = 403;
      error.code = "UserBlocked";
      throw error;
    }

    const code = randomSixDigitCode();

    tenant.secondaryUserAccess = {
      code: await hash(code),
      expires: new Date(Date.now() + 15 * 60 * 1000),
      type: SecondaryUserAccessMethodType.MFA,
    };

    await tenant.save();

    const result: any = {
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      role: tenant.role,
      scopes: tenant.scopes,
      secretKey: tenant.secretKey,
    };

    const { access_token, refresh_token } = await generateTenantToken(
      { jwtPayload: result },
      tenant.secretKey
    );

    const recipient: Recipient = {
      email: tenant.email,
      fullName: `${tenant.firstName} ${tenant.lastName}`,
    };

    await sendTemplateEmail(templates.loginByCodeMFA.id, {
      recipient,
      variable: code,
    });

    res.status(200).json({
      message: "User sign in successfully",
      user: result,
      access_token,
      refresh_token,
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default loginHandler;
