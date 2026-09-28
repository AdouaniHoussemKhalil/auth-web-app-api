import config from "config";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { createError } from "../error/errorHandler";

const setting = <T>(key: string, fallback: T): T =>
  config.has(key) ? config.get<T>(key) : fallback;

export const createRateLimiter = (options: { windowMs: number; max: number }) =>
  rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Les applications clientes appellent depuis leur back-end : on compte par application et par IP.
    keyGenerator: (req) => `${req.headers["x-app-id"] ?? "tenant"}:${ipKeyGenerator(req.ip ?? "")}`,
    handler: (_req, _res, next) =>
      next(createError(429, "tooManyRequests", "Too many requests, please try again later")),
  });

const noLimit: ReturnType<typeof rateLimit> = Object.assign(
  (_req: unknown, _res: unknown, next: () => void) => next(),
  { resetKey: () => undefined, getKey: () => undefined }
) as any;

// Limite les routes sensibles (connexion, codes, mot de passe) contre la force brute.
export const authRateLimiter = setting("rateLimit.enabled", true)
  ? createRateLimiter({
      windowMs: setting("rateLimit.windowMs", 15 * 60 * 1000),
      max: setting("rateLimit.max", 20),
    })
  : noLimit;
