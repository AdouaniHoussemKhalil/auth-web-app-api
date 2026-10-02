import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { generateConsumerToken } from "../../../services/token/tokenService";
import { Consumer } from "../../../models/Consumer";
import { compare } from "../../../services/hashing/hash";
import { mfaRequiredResponse, sendLoginMFACode } from "../../../services/mfa/loginCode";

const loginUserHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { email, password } = request.body;
    if (!email || !password) {
      const error = new Error("Missing required filds") as CustomError;
      error.status = 400;
      throw error;
    }

    const appClient = (request as any).appClient;

    const user = await Consumer.findOne({ email, clientId: appClient.id });
    if (!user) {
      const error = new Error("Invalid email or password") as CustomError;
      error.status = 401;
      error.code = "invalidCredentials";
      throw error;
    }

    // Un consumer inscrit via Google n'a pas de mot de passe : il doit passer par /consumers/auth/google.
    if (!user.password) {
      const error = new Error("This account uses Google sign-in") as CustomError;
      error.status = 401;
      error.code = "useGoogleSignIn";
      throw error;
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      const error = new Error("Invalid email or password") as CustomError;
      error.status = 401;
      error.code = "invalidCredentials";
      throw error;
    }

    // Vérifié après le mot de passe : un tiers ne peut pas savoir qu'un compte est bloqué.
    if (!user.isActive) {
      const error = new Error("User is blocked") as CustomError;
      error.status = 403;
      error.code = "UserBlocked";
      throw error;
    }

    if (appClient.requireEmailVerification && !user.isEmailVerified) {
      const error = new Error("Email address is not verified") as CustomError;
      error.status = 403;
      error.code = "emailNotVerified";
      throw error;
    }

    if (user.isMFAActivated) {
      await sendLoginMFACode(user, appClient);
      return response.status(200).json(mfaRequiredResponse);
    }

    const returnedUser: any = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      scopes: user.scopes,
    };

    const { access_token, refresh_token } = await generateConsumerToken(
      { jwtPayload: returnedUser },
      appClient.id,
      user.id
    );

    return response.status(200).json({
      access_token,
      refresh_token,
      user: returnedUser,
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default loginUserHandler;
