import express from "express";
import cors from "cors";
import config from "config";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { logger } from "./utils/logger";
import errorHandler, { notFoundHandler } from "./middleware/error/errorHandler";
import consumersRoutes from "./app/routes/consumersRoutes";
import tenantsRoutes from "./app/routes/tenantsRoutes";
import configurationsRoutes from "./app/routes/configurationsRoutes";
import healthRoutes from "./app/routes/healthRoutes";
import { setupSwagger } from "./app/swagger/swagger";

// "*" (défaut) autorise toutes les origines ; en production, lister les fronts autorisés.
const corsOrigins = config.has("cors.origins")
  ? config.get<string | string[]>("cors.origins")
  : "*";

// Express réécrit req.url dans les routeurs : originalUrl garde le chemin complet.
const requestLine = (
  req: { method?: string; url?: string; originalUrl?: string },
  status: number
) => `${req.method} ${req.originalUrl ?? req.url} ${status}`;

export const createApp = () => {
  const app = express();

  // Derrière un reverse proxy, nécessaire pour que la limitation par IP voie la vraie adresse.
  if (config.has("server.trustProxy")) app.set("trust proxy", config.get("server.trustProxy"));

  // Avant les logs et la limitation de débit : sondes fréquentes, sans authentification.
  app.use("/health", healthRoutes);

  app.use(
    pinoHttp({
      logger,
      // Les fichiers statiques de Swagger UI encombreraient les logs.
      autoLogging: { ignore: (req) => req.url?.startsWith("/api-docs") ?? false },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
      customSuccessMessage: (req, res) => requestLine(req, res.statusCode),
      customErrorMessage: (req, res) => requestLine(req, res.statusCode),
      // Ni en-têtes ni corps dans les logs : seulement de quoi suivre la requête.
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    })
  );
  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));

  setupSwagger(app);

  app.use(express.json());
  app.use("/consumers", consumersRoutes);
  app.use("/tenants", tenantsRoutes);
  app.use("/config", configurationsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
