import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { createError } from "../../../middleware/error/errorHandler";
import { IAppClient } from "../../../models/AppClient";
import { Consumer } from "../../../models/Consumer";
import { UserRole } from "../../../models/enums/UserRole";
import { googleNames, verifyGoogleIdToken } from "../../../services/google/verifyGoogleIdToken";
import { mfaRequiredResponse, sendLoginMFACode } from "../../../services/mfa/loginCode";
import { consumerTokenPayload } from "../../../services/token/payloads";
import { generateConsumerToken } from "../../../services/token/tokenService";

const config = require("config");
const scopes = config.get("consumer.scopes");

/**
 * Inscription / connexion d'un consumer avec un ID token Google, vérifié avec le Client ID Google de l'application.
 * Premier passage : le compte est créé, sans mot de passe, avec l'adresse vérifiée par Google.
 */
const googleLoginHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appClient: IAppClient = (req as any).appClient;
    if (!appClient.googleClientId) {
      throw createError(
        400,
        "googleSignInDisabled",
        "Google sign-in is not configured for this application"
      );
    }

    const identity = await verifyGoogleIdToken(req.body.token, appClient.googleClientId);

    let user = await Consumer.findOne({ email: identity.email, clientId: appClient.id });
    const isNewUser = !user;

    if (!user) {
      user = await Consumer.create({
        id: crypto.randomUUID(),
        clientId: appClient.id,
        email: identity.email,
        ...googleNames(identity),
        isActive: true,
        isByGoogle: true,
        isEmailVerified: true,
        isMFAActivated: false,
        role: UserRole.CONSUMER,
        scopes,
      });
    } else if (!user.isEmailVerified) {
      // Google vient de prouver que l'utilisateur contrôle cette adresse.
      user.isEmailVerified = true;
      await user.save();
    }

    if (!user.isActive) {
      throw createError(403, "UserBlocked", "User is blocked");
    }

    if (user.isMFAActivated) {
      await sendLoginMFACode(user, appClient);
      return res.status(200).json(mfaRequiredResponse);
    }

    const payload = consumerTokenPayload(user);
    const { access_token, refresh_token } = await generateConsumerToken(
      { jwtPayload: payload },
      appClient.id,
      user.id
    );

    res.status(isNewUser ? 201 : 200).json({
      access_token,
      refresh_token,
      user: payload,
      isNewUser,
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default googleLoginHandler;
