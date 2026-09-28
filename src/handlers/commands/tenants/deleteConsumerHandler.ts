import { NextFunction, Request, Response } from "express";
import { createError } from "../../../middleware/error/errorHandler";
import { Consumer } from "../../../models/Consumer";
import { deleteConsumerAccount } from "../../../services/accounts/deleteAccounts";

// Suppression d'un consumer par le tenant propriétaire de l'application (vérifié par le middleware).
const deleteConsumerHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { appId, consumerId } = request.params;

    if (!(await Consumer.exists({ id: consumerId, clientId: appId }))) {
      throw createError(404, "consumerNotFound", "Consumer not found");
    }

    await deleteConsumerAccount(consumerId, appId);

    response.status(200).json({ message: "Consumer deleted", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default deleteConsumerHandler;
