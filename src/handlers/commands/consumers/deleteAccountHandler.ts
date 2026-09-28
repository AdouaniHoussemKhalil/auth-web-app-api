import { NextFunction, Request, Response } from "express";
import { createError } from "../../../middleware/error/errorHandler";
import { Consumer } from "../../../models/Consumer";
import { deleteConsumerAccount } from "../../../services/accounts/deleteAccounts";
import { compare } from "../../../services/hashing/hash";

// Suppression de son propre compte par le consumer, confirmée par son mot de passe.
const deleteAccountHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const appClient = (request as any).appClient;
    const user = await Consumer.findOne({ id: request.params.id, clientId: appClient.id });

    if (!user || !(await compare(request.body.password, user.password))) {
      throw createError(401, "invalidCredentials", "Invalid password");
    }

    await deleteConsumerAccount(user.id, appClient.id);

    response.status(200).json({ message: "Account deleted", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default deleteAccountHandler;
