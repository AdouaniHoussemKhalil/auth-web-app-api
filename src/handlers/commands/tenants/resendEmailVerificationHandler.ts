import { NextFunction, Request, Response } from "express";
import { Tenant } from "../../../models/Tenant";
import { sendEmailVerification } from "../../../services/email/sendEmailVerification";

// Même réponse dans tous les cas (compte inexistant ou déjà vérifié) pour ne pas révéler les e-mails inscrits.
const resendEmailVerificationHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const tenant = await Tenant.findOne({ email: request.body.email, isActive: true });
    if (tenant && !tenant.isEmailVerified) {
      await sendEmailVerification(tenant);
    }

    response.status(200).json({
      message: "If this email needs verification, a new code has been sent",
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default resendEmailVerificationHandler;
