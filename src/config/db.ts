import { logger } from "../utils/logger";
import mongoose, { MongooseError } from "mongoose";

mongoose.connection.on("connected", () => {
  logger.info("Mongoose connected to DB");
});

mongoose.connection.on("error", (error: MongooseError) => {
  logger.error({ err: error }, "Mongoose connection error");
});

mongoose.connection.on("disconnected", () => {
  logger.warn("Mongoose disconnected");
});

export const connectDB = async (uri: string) => {
  await mongoose.connect(uri);
};

export default mongoose;
