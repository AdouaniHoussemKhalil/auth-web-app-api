import { NextFunction, Request, Response } from "express";
import { createError } from "../../../middleware/error/errorHandler";
import { Tenant } from "../../../models/Tenant";
import { tenantTokenPayload } from "../../../services/token/payloads";

/**
 * Modification du profil par le tenant connecté (le middleware garantit que :tenantId est le sien).
 * Les tokens déjà émis gardent l'ancien nom jusqu'à leur renouvellement : le front utilise la réponse.
 */
const updateProfileHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // validate() vérifie le corps sans appliquer les transformations zod (trim) : on nettoie ici.
    const firstName = String(req.body.firstName).trim();
    const lastName = String(req.body.lastName).trim();

    const tenant = await Tenant.findOneAndUpdate(
      { id: req.params.tenantId },
      { firstName, lastName },
      { new: true }
    );
    if (!tenant) throw createError(404, "tenantNotFound", "Tenant not found");

    res.status(200).json({
      message: "Profile updated",
      user: tenantTokenPayload(tenant),
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default updateProfileHandler;
