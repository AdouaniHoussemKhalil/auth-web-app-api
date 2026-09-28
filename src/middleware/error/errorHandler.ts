import { logger } from "../../utils/logger";
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export interface CustomError extends Error {
  status?: number | undefined;
  message: string;
  code?: string | undefined;
  details?: any | undefined;
  // Positionné par express.json() quand le corps n'est pas un JSON valide.
  type?: string;
}

export const createError = (status: number, code: string, message: string, details?: unknown) => {
  const error = new Error(message) as CustomError;
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
};

// Code utilisé quand une erreur n'en précise pas.
const defaultCodes: Record<number, string> = {
  400: "badRequest",
  401: "unauthorized",
  403: "forbidden",
  404: "notFound",
  409: "conflict",
  429: "tooManyRequests",
};

const send = (response: Response, status: number, code: string, message: string, details = null) =>
  response.status(status).json({ error: { status, code, message, isSuccess: false, details } });

export const notFoundHandler = (request: Request, _response: Response, next: NextFunction) =>
  next(createError(404, "routeNotFound", `Route ${request.method} ${request.path} not found`));

const errorHandler = (
  error: CustomError | ZodError,
  _request: Request,
  response: Response,
  _next: NextFunction
) => {
  if (error instanceof ZodError) {
    const details = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    return send(response, 400, "validationError", "Validation Error", details as any);
  }

  if (error.type === "entity.parse.failed") {
    return send(response, 400, "invalidJson", "Request body is not valid JSON");
  }

  const status = error.status || 500;

  // Les erreurs internes (base de données, librairies...) ne sont pas exposées au client.
  if (status >= 500) {
    logger.error({ err: error }, "Unhandled error");
    return send(response, status, "internalError", "An unexpected error occurred");
  }

  return send(
    response,
    status,
    error.code || defaultCodes[status] || "error",
    error.message || "An error occurred",
    error.details || null
  );
};

export default errorHandler;
