import { createError } from "../../../middleware/error/errorHandler";
import { Request, Response, NextFunction } from "express";
import { Consumer } from "../../../models/Consumer";

const getConsumerDetailsByIdQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const consumer = await Consumer.findOne({ id, clientId: (req as any).appClient.id }).lean();

    if (!consumer) {
      return next(createError(404, "consumerNotFound", "Consumer not found"));
    }

    const result = {
      firstName: consumer.firstName,
      lastName: consumer.lastName,
      email: consumer.email,
      isActive: consumer.isActive,
      isMFAEnabled: consumer.isMFAActivated,
      isEmailVerified: consumer.isEmailVerified,
      creationDate: consumer.createdOn,
      id: consumer.id,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching consumer:", error);
    next(error);
  }
};

export default getConsumerDetailsByIdQuery;
