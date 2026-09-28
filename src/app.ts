import express from "express";
import cors from "cors";
import config from "config";
import helmet from "helmet";
import errorHandler from "./middleware/error/errorHandler";
import consumersRoutes from "./app/routes/consumersRoutes";
import tenantsRoutes from "./app/routes/tenantsRoutes";
import configurationsRoutes from "./app/routes/configurationsRoutes";
import { setupSwagger } from "./app/swagger/swagger";

// "*" (défaut) autorise toutes les origines ; en production, lister les fronts autorisés.
const corsOrigins = config.has("cors.origins")
  ? config.get<string | string[]>("cors.origins")
  : "*";

export const createApp = () => {
  const app = express();

  // Derrière un reverse proxy, nécessaire pour que la limitation par IP voie la vraie adresse.
  if (config.has("server.trustProxy")) app.set("trust proxy", config.get("server.trustProxy"));

  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));

  setupSwagger(app);

  app.use(express.json());
  app.use("/consumers", consumersRoutes);
  app.use("/tenants", tenantsRoutes);
  app.use("/config", configurationsRoutes);

  app.use(errorHandler);

  return app;
};
