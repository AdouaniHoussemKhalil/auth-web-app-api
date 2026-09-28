import { NextFunction, Response, Request } from "express";
import AppClient from "../../../models/AppClient";
import { paginate } from "../../../validation/paginationSchema";

// Applications du tenant, paginées (actives d'abord, puis les plus récentes).
// Le tenant est déjà vérifié par tenantProtectedActionsAuthToken.
const getAppClientsQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { page, limit } = res.locals.query;

    const [apps, total] = await Promise.all([
      AppClient.find({ tenantId })
        .sort({ isActive: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AppClient.countDocuments({ tenantId }),
    ]);

    res.status(200).json(paginate(apps, total, { page, limit }));
  } catch (error) {
    next(error);
  }
};

export default getAppClientsQuery;
