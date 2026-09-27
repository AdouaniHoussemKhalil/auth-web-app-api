import mongoose, { MongooseError } from "mongoose";

mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to DB");
});

mongoose.connection.on("error", (error: MongooseError) => {
  console.error(`Mongoose connection error: ${error}`);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected");
});

export const connectDB = async (uri: string) => {
  await mongoose.connect(uri);
};

export default mongoose;
