import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import AppClient from "../../../models/AppClient";
import { Consumer } from "../../../models/Consumer";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { escapeHtml } from "../../../services/email/layout";
import { withParams } from "../../../services/email/links";
import { consumeOneTimeCode } from "../../../services/security/oneTimeCode";

type FailureReason = "expired" | "invalid";

/** Page minimale, quand l'application n'a pas configuré d'URL de redirection. */
const page = (res: Response, status: number, title: string, message: string) =>
  res
    .status(status)
    .type("html")
    .send(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>` +
        `<body style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#F4F3EF;color:#1F1E1D;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">` +
        `<main style="background:#fff;border-radius:12px;padding:32px;max-width:420px;margin:16px"><h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1><p style="margin:0;color:#3D3B37">${escapeHtml(message)}</p></main></body></html>`
    );

/**
 * Lien de vérification d'e-mail (GET, ouvert depuis l'e-mail, sans identifiants d'application) :
 * vérifie l'adresse puis redirige vers emailVerifiedUrl, ou vers emailVerificationFailedUrl?reason=….
 * Un lien rouvert sur une adresse déjà vérifiée mène au succès : les antivirus de messagerie
 * ouvrent parfois les liens avant l'utilisateur.
 */
const verifyEmailLinkHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = typeof req.query.u === "string" ? req.query.u : "";
    const token = typeof req.query.t === "string" ? req.query.t : "";

    const user = userId ? await Consumer.findOne({ id: userId }) : null;
    const app = user ? await AppClient.findOne({ id: user.clientId }) : null;

    const succeed = () =>
      app?.emailVerifiedUrl
        ? res.redirect(303, app.emailVerifiedUrl)
        : page(res, 200, "Adresse e-mail confirmée", "Vous pouvez retourner sur l'application.");
    const fail = (reason: FailureReason) =>
      app?.emailVerificationFailedUrl
        ? res.redirect(303, withParams(app.emailVerificationFailedUrl, { reason }))
        : page(
            res,
            400,
            reason === "expired" ? "Lien expiré" : "Lien invalide",
            "Demandez un nouveau lien de vérification depuis l'application."
          );

    if (!user || !app || !user.isActive || !token) return fail("invalid");
    if (user.isEmailVerified) return succeed();

    try {
      await consumeOneTimeCode(user, SecondaryUserAccessMethodType.EmailVerification, token);
    } catch (error) {
      return fail((error as CustomError).code === "expiredCode" ? "expired" : "invalid");
    }

    user.isEmailVerified = true;
    await user.save();
    return succeed();
  } catch (error) {
    next(error);
  }
};

export default verifyEmailLinkHandler;
