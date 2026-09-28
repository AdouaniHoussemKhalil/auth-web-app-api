import { NextFunction, Request, Response } from "express";
import { createError } from "../../../middleware/error/errorHandler";
import { Tenant } from "../../../models/Tenant";
import { deleteTenantAccount } from "../../../services/accounts/deleteAccounts";
import { compare } from "../../../services/hashing/hash";

/**
 * Suppression du compte tenant, en cascade (applications, consumers, sessions).
 * Confirmation : le mot de passe, ou pour un compte Google sans mot de passe, l'adresse e-mail recopiée.
 */
const deleteAccountHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { password, confirmEmail } = request.body;
    const tenant = await Tenant.findOne({ id: request.params.tenantId });
    if (!tenant) throw createError(404, "tenantNotFound", "Tenant not found");

    const confirmed = tenant.password
      ? Boolean(password) && (await compare(password, tenant.password))
      : confirmEmail?.toLowerCase() === tenant.email.toLowerCase();

    if (!confirmed) {
      throw createError(401, "invalidCredentials", "Account deletion was not confirmed");
    }

    await deleteTenantAccount(tenant.id);

    response.status(200).json({ message: "Account deleted", isSuccess: true });
  } catch (error) {
    next(error);
  }
};

export default deleteAccountHandler;
