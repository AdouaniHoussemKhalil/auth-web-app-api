import express from "express";
import config from "config"
import cors from "cors"
import bodyParser from "body-parser";
import authRoutes from "./routes/authRoutes";
import errorHandler from "./middleware/error/errorHandler";
import { MongooseError } from "mongoose";
import mongoose from "./db";
import configRoutes from "./routes/configRoutes";


const app = express();
const port = config.get("server.port");

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to DB Cluster");
});

mongoose.connection.on("error", (error: MongooseError) => {
  console.error(`Mongoose connection error: ${error}`);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected");
});


app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use("/auth", authRoutes);
app.use("/config", configRoutes);
app.use(errorHandler);



