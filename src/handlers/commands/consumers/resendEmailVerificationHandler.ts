import { NextFunction, Request, Response } from "express";
import { Consumer } from "../../../models/Consumer";
import { sendEmailVerification } from "../../../services/email/sendEmailVerification";

// Même réponse dans tous les cas (compte inexistant ou déjà vérifié) pour ne pas révéler les e-mails inscrits.
const resendEmailVerificationHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const appClient = (request as any).appClient;
    const { email } = request.body;

    const user = await Consumer.findOne({ email, clientId: appClient.id, isActive: true });
    if (user && !user.isEmailVerified) {
      await sendEmailVerification(user, appClient);
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
