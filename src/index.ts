import express from "express";
import config from "config"
import cors from "cors"
import bodyParser from "body-parser";
import errorHandler from "./middleware/error/errorHandler";
import { MongooseError } from "mongoose";
import mongoose from "./config/db";
import consumersRoutes from "./app/routes/consumersRoutes";
import tenantsRoutes from "./app/routes/tenantsRoutes";
import configurationsRoutes from "./app/routes/configurationsRoutes";
import { setupSwagger } from "./app/swagger/swagger";


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

setupSwagger(app);

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use("/consumers", consumersRoutes);
app.use("/tenants", tenantsRoutes);
app.use("/config", configurationsRoutes);


app.use(errorHandler);



