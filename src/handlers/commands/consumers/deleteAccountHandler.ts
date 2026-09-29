import { NextFunction, Request, Response } from "express";
import { createError } from "../../../middleware/error/errorHandler";
import { Consumer } from "../../../models/Consumer";
import { deleteConsumerAccount } from "../../../services/accounts/deleteAccounts";
import { compare } from "../../../services/hashing/hash";

// Suppression de son propre compte par le consumer. Confirmation : le mot de passe, ou pour un compte Google
// sans mot de passe, l'adresse e-mail recopiée.
const deleteAccountHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const appClient = (request as any).appClient;
    const { password, confirmEmail } = request.body;
    const user = await Consumer.findOne({ id: request.params.id, clientId: appClient.id });

    const confirmed =
      user &&
      (user.password
        ? Boolean(password) && (await compare(password, user.password))
        : confirmEmail?.toLowerCase() === user.email.toLowerCase());

    if (!user || !confirmed) {
      throw createError(401, "invalidCredentials", "Account deletion was not confirmed");
    }

    await deleteConsumerAccount(user.id, appClient.id);

    response.status(200).json({ message: "Account deleted", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default deleteAccountHandler;
