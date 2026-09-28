import { RequestHandler } from "express";
import { ZodSchema } from "zod";

// Les erreurs de validation (ZodError) sont formatées par errorHandler : 400 validationError.
const validate =
  (schema: ZodSchema): RequestHandler =>
  (req, _res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };

export default validate;
