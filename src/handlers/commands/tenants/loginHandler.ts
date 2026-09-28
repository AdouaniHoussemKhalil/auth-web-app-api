import { Response, Request, NextFunction } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { Tenant } from "../../../models/Tenant";
import { compare } from "../../../services/hashing/hash";
import { setOneTimeCode } from "../../../services/security/oneTimeCode";
import { randomSixDigitCode } from "../../../utils/random";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { Recipient } from "../../../services/email/models/Recipient";
import { templates } from "../../../services/email/models/Template";
import sendTemplateEmail from "../../../services/email/sendMails";

const loginHandler = async (req: Request, res: Response, next: NextFunction) => {
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

    // Un tenant inscrit via Google n'a pas de mot de passe : il doit passer par /tenants/google-register.
    if (!tenant.password) {
      const error = new Error("This account uses Google sign-in") as CustomError;
      error.status = 401;
      error.code = "useGoogleSignIn";
      throw error;
    }

    const isPasswordValid = await compare(password, tenant.password);

    if (!isPasswordValid) {
      const error = new Error("Invalid email or password") as CustomError;
      error.status = 401;
      error.code = "invalidCredentials";
      throw error;
    }

    if (!tenant.isEmailVerified) {
      const error = new Error("Email address is not verified") as CustomError;
      error.status = 403;
      error.code = "emailNotVerified";
      throw error;
    }

    if (!tenant.isActive) {
      const error = new Error("User is blocked") as CustomError;
      error.status = 403;
      error.code = "UserBlocked";
      throw error;
    }

    const code = randomSixDigitCode();

    await setOneTimeCode(tenant, SecondaryUserAccessMethodType.MFA, code, 15 * 60 * 1000);
    await tenant.save();

    const recipient: Recipient = {
      email: tenant.email,
      fullName: `${tenant.firstName} ${tenant.lastName}`,
    };

    await sendTemplateEmail(templates.loginByCodeMFA.id, {
      recipient,
      variable: code,
    });

    // Les tokens ne sont délivrés qu'après validation du code (/tenants/loginByMFACode).
    res.status(200).json({
      MFARequired: true,
      message: "MFA is required, Please check your email for the verification code.",
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default loginHandler;
