import { NextFunction, Request, Response } from "express";
import { isError } from "lodash";
import { ZodError } from "zod";

export interface CustomError extends Error {
  status?: number | undefined;
  message: string;
  code?: string | undefined;
  details?: any | undefined;
}

const errorHandler = (
  error: CustomError | ZodError,
  request: Request,
  response: Response,
  next: NextFunction
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: "ValidationError",
      code: "validationError",
      detatils: error.errors.map((err) => ({
        filed: err.path.join("."),
        message: err.message,
        code: err.code,
        isSuccess: false
      })),
    });
    return;
  }

  const status = error.status || 500;
  const message = error.message || "An unexpected error occurred";
  const code = error.code || error.message.replace(' ','_');

  response.status(status).json({
    error: { status, code, message,isSuccess: false ,details: error.details || null },
  });
  next();
};

export default errorHandler;
