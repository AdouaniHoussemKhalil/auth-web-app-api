import { NextFunction, Response, Request } from "express";
import AppClient from "../../../models/AppClient";
import { Tenant } from "../../../models/Tenant";
import { CustomError } from "../../../middleware/error/errorHandler";

const getAppClientByIdQuery = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantId, appId } = req.params;

    if (!tenantId || !appId) {
      return res
        .status(400)
        .json({ message: "tenantId and appId are required" });
    }

    const tenant = await Tenant.findOne({id: tenantId});
    if (!tenant) {
      const error = new Error("Tenant not exist") as CustomError;
      error.status = 401;
      error.code = "tenantNotExist";
      throw error;
    }

    const app = await AppClient.findOne({
      id: appId,
      tenantId: tenantId,
    }).lean();

    if (!app) {
      const error = new Error("App not found for this tenant") as CustomError;
      error.status = 404;
      error.code = "appNotFound";
      throw error;
    }

    res.status(200).json(app);
  } catch (error) {
    console.error("Error fetching app client:", error);
    next(error);
  }
};

export default getAppClientByIdQuery;
