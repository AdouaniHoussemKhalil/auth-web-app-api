import { RequestHandler } from "express";
import { ZodError, ZodSchema } from "zod";
import { CustomError } from "../error/errorHandler";

const validate =
  (schema: ZodSchema): RequestHandler =>
  (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const error = new Error("Validation Error") as CustomError;
        error.status = 400;
        error.details = err.errors.map((error) => ({
          field: error.path.join("."),
          message: error.message,
        }));
        return next(error);
      }
    }
  };

export default validate;
