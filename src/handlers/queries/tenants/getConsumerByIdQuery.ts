import { createError } from "../../../middleware/error/errorHandler";
import { Request, Response, NextFunction } from "express";
import { Consumer } from "../../../models/Consumer";

const getConsumerByIdQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { consumerId, appId } = req.params;

    const consumer = await Consumer.findOne({ id: consumerId, clientId: appId }).lean();

    if (!consumer) {
      return next(createError(404, "consumerNotFound", "Consumer not found"));
    }

    const {
      password: _password,
      secondaryUserAccess: _secondaryUserAccess,
      oneTimeCodes: _oneTimeCodes,
      ...sanitizedConsumer
    } = consumer;

    res.status(200).json(sanitizedConsumer);
  } catch (error) {
    next(error);
  }
};

export default getConsumerByIdQuery;
