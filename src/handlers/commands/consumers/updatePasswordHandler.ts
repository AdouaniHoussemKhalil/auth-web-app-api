import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { compare, hash } from "../../../services/hashing/hash";
import { Consumer } from "../../../models/Consumer";
import { sendPasswordChangedAlert } from "../../../services/email/sendPasswordChangedAlert";
import { consumerTokenPayload } from "../../../services/token/payloads";
import {
  generateConsumerToken,
  revokeAllRefreshTokens,
} from "../../../services/token/tokenService";

const updatePasswordHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { id } = request.params;
    const { userId, currentPassword, password, confirmPassword } = request.body;

    if (!password || !userId || !id || !currentPassword || !confirmPassword) {
      const error = new Error("Some required fields are missing") as CustomError;
      error.status = 400;
      throw error;
    }

    if (id !== userId) {
      const error = new Error("User ID mismatch") as CustomError;
      error.status = 400;
      error.code = "userIdMismatch";
      throw error;
    }

    if (password !== confirmPassword) {
      const error = new Error("Passwords do not match") as CustomError;
      error.status = 400;
      error.code = "passwordsDoNotMatch";
      throw error;
    }

    const user = await Consumer.findOne({ id: userId, clientId: (request as any).appClient.id });

    if (!user) {
      const error = new Error("User not exist") as CustomError;
      error.status = 401;
      error.code = "userNotExist";
      throw error;
    }

    const isCurrentPasswordValid = await compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      const error = new Error("current password is not correct") as CustomError;
      error.status = 400;
      error.code = "currentPasswordNotCorrect";
      throw error;
    }

    user.password = await hash(password);
    await user.save();

    // Toutes les sessions sont fermées (y compris leurs access tokens) ; l'appareil courant reçoit une nouvelle paire.
    await revokeAllRefreshTokens("consumer", user.id, user.clientId);
    await sendPasswordChangedAlert(user, (request as any).appClient);
    const tokens = await generateConsumerToken(
      { jwtPayload: consumerTokenPayload(user) },
      user.clientId,
      user.id
    );

    return response.status(201).json({
      message: "update password successfuly",
      ...tokens,
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default updatePasswordHandler;
