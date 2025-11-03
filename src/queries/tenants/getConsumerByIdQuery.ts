import { Request, Response, NextFunction } from "express";
import { Consumer } from "../../models/Consumer";

const getConsumerByIdQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Consumer ID is required" });
    }

    const consumer = await Consumer.findById(id).lean();

    if (!consumer) {
      return res.status(404).json({ message: "Consumer not found" });
    }

    const { password, ...sanitizedConsumer } = consumer;

    res.status(200).json(sanitizedConsumer);
  } catch (error) {
    console.error("Error fetching consumer:", error);
    next(error);
  }
};

export default getConsumerByIdQuery;
