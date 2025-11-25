import { Request, Response, NextFunction } from "express";
import { Tenant } from "../../../models/Tenant";
import { CustomError } from "../../../middleware/error/errorHandler";
import AppClient from "../../../models/AppClient";

const updateClientAppHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantId, appId } = req.params;

    const tenant = await Tenant.findOne({id: tenantId});

    if (!tenant) {
      const error = new Error("Tenant not exist") as CustomError;
      error.status = 401;
      error.code = "tenantNotExist";
      throw error;
    }

    const app = await AppClient.findOne({id: appId});

    if (!app || app.tenantId !== tenantId) {
      const error = new Error("App client not exist") as CustomError;
      error.status = 401;
      error.code = "appClientNotExist";
      throw error;
    }

    const { isActive } = req.body;

    if (typeof isActive !== "undefined" && isActive !== app.isActive) {
      app.isActive = isActive;
      await app.save();
    }
    return res.status(200).json({
      isSuccess: true,
      message: "App client updated successfully",
      data: { appId: app.id },
    });
  } catch (error) {
    console.error("Error updating app client:", error);
    next(error);
  }
};

export default updateClientAppHandler;
