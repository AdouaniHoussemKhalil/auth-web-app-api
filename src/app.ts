import express from "express";
import cors from "cors";
import errorHandler from "./middleware/error/errorHandler";
import consumersRoutes from "./app/routes/consumersRoutes";
import tenantsRoutes from "./app/routes/tenantsRoutes";
import configurationsRoutes from "./app/routes/configurationsRoutes";
import { setupSwagger } from "./app/swagger/swagger";

export const createApp = () => {
  const app = express();

  setupSwagger(app);

  app.use(cors());
  app.use(express.json());
  app.use("/consumers", consumersRoutes);
  app.use("/tenants", tenantsRoutes);
  app.use("/config", configurationsRoutes);

  app.use(errorHandler);

  return app;
};
