import { NextFunction, Response, Request } from "express";
import { Consumer } from "../../../models/Consumer";

const getConsumersQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId } = req.params;

    const consumers = await Consumer.find({ clientId: appId })
      .sort({ isActive: -1, createdAt: -1 })
      .lean();

    const sanitizedConsumers = consumers.map(
      ({ password: _password, secondaryUserAccess: _secondaryUserAccess, ...rest }) => rest
    );

    res.status(200).json(sanitizedConsumers);
  } catch (error) {
    next(error);
  }
};

export default getConsumersQuery;
