import { Request, Response, NextFunction } from "express";
import { Consumer } from "../../../models/Consumer";

const getConsumerDetailsByIdQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Consumer ID is required" });
    }

    const consumer = await Consumer.findOne({id: id}).lean();

    if (!consumer) {
      return res.status(404).json({ message: "Consumer not found" });
    }

    const result = {
      firstName: consumer.firstName,
      lastName: consumer.lastName,
      email: consumer.email,
      isActive: consumer.isActive,
      isMFAEnabled: consumer.isMFAActivated,
      creationDate: consumer.createdOn,
      id: consumer.id
    }

    
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching consumer:", error);
    next(error);
  }
};

export default getConsumerDetailsByIdQuery;
