import config from "config";
import pino, { LoggerOptions } from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

// Jamais de secret dans les logs, même si un objet complet est journalisé par erreur.
export const redactedPaths = [
  "req.headers.authorization",
  'req.headers["x-app-secret"]',
  "*.password",
  "*.confirmPassword",
  "*.currentPassword",
  "*.secretKey",
  "*.refreshToken",
  "*.resetToken",
  "*.token",
];

export const loggerOptions: LoggerOptions = {
  level: config.has("log.level") ? config.get<string>("log.level") : isTest ? "silent" : "info",
  redact: { paths: redactedPaths, censor: "[redacted]" },
};

// pino-pretty est une dépendance de développement : absente d'une installation de production.
const hasPrettyPrinter = () => {
  try {
    require.resolve("pino-pretty");
    return true;
  } catch {
    return false;
  }
};

/**
 * Logger de l'application : JSON en production (exploitable par Render), lisible en développement,
 * silencieux pendant les tests. Niveau réglable avec `log.level` (trace, debug, info, warn, error, silent).
 */
export const logger = pino({
  ...loggerOptions,
  ...(!isProduction &&
    !isTest &&
    hasPrettyPrinter() && {
      transport: {
        target: "pino-pretty",
        // En développement, la ligne « POST /tenants/login 200 » suffit : le détail req/res reste dans le JSON.
        options: { translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname,req,res" },
      },
    }),
});
