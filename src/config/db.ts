import config from "config";
import mongoose, { MongooseError } from "mongoose";

const MONGO_URI: string = config.get("db.uri");

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((error: MongooseError) => {
    console.error("Error connecting to DB:", error);
  });

export default mongoose;
