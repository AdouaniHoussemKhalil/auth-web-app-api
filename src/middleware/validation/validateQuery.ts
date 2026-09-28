import { RequestHandler } from "express";
import { ZodSchema } from "zod";

/**
 * Valide la chaîne de requête et range les valeurs converties (nombres, valeurs par défaut) dans
 * res.locals.query. Les erreurs (ZodError) sont formatées par errorHandler : 400 validationError.
 */
const validateQuery =
  (schema: ZodSchema): RequestHandler =>
  (req, res, next) => {
    try {
      res.locals.query = schema.parse(req.query);
      next();
    } catch (error) {
      next(error);
    }
  };

export default validateQuery;
