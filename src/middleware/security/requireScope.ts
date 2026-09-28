import { NextFunction, Request, Response } from "express";
import { createError } from "../error/errorHandler";

type ScopeResolver = string | ((req: Request) => string);

/**
 * Exige un scope dans le token déjà vérifié : à placer après tenantProtectedActionsAuthToken
 * ou consumerProtectedActionsAuthToken. Les scopes viennent du token signé, jamais de la requête.
 */
export const requireScope =
  (scope: ScopeResolver) => (req: Request, _res: Response, next: NextFunction) => {
    const token = (req as any).tenant ?? (req as any).user;
    if (!token) {
      return next(new Error("requireScope must run after a token authentication middleware"));
    }

    const required = typeof scope === "function" ? scope(req) : scope;
    const granted: string[] = token.jwtPayload?.scopes ?? [];

    if (!granted.includes(required)) {
      return next(createError(403, "insufficientScope", `Missing scope ${required}`));
    }
    next();
  };

// Scope d'une demande MFA : il dépend du type demandé (activation ou désactivation).
export const mfaRequestScope = (req: Request) =>
  req.body?.requestType === "deactivate" ? "consumer:deactivateMFA" : "consumer:activateMFA";
