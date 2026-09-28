import { NextFunction, Response, Request } from "express";
import { Consumer } from "../../../models/Consumer";
import { paginate } from "../../../validation/paginationSchema";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Consumers d'une application, paginés (actifs d'abord, puis les plus récents).
const getConsumersQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId } = req.params;
    const { page, limit, email } = res.locals.query;

    const filter = {
      clientId: appId,
      ...(email && { email: { $regex: escapeRegex(email), $options: "i" } }),
    };

    const [consumers, total] = await Promise.all([
      Consumer.find(filter)
        .select("-password -secondaryUserAccess -oneTimeCodes")
        .sort({ isActive: -1, createdOn: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Consumer.countDocuments(filter),
    ]);

    res.status(200).json(paginate(consumers, total, { page, limit }));
  } catch (error) {
    next(error);
  }
};

export default getConsumersQuery;
