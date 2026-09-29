import { NextFunction, Request, Response } from "express";
import { createError } from "../../../middleware/error/errorHandler";
import { Consumer } from "../../../models/Consumer";
import { revokeAllRefreshTokens } from "../../../services/token/tokenService";

// Blocage / déblocage d'un consumer par le tenant propriétaire de l'application (vérifié par le middleware).
// Bloquer ferme toutes ses sessions : ses access tokens deviennent aussitôt invalides.
const updateConsumerStatusHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId, consumerId } = req.params;
    const { isActive } = req.body;

    const consumer = await Consumer.findOneAndUpdate(
      { id: consumerId, clientId: appId },
      { isActive },
      { new: true }
    )
      .select("-password -secondaryUserAccess -oneTimeCodes")
      .lean();

    if (!consumer) {
      throw createError(404, "consumerNotFound", "Consumer not found");
    }

    if (!isActive) {
      await revokeAllRefreshTokens("consumer", consumerId, appId);
    }

    res.status(200).json({
      message: isActive ? "Consumer unblocked" : "Consumer blocked",
      data: consumer,
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default updateConsumerStatusHandler;
