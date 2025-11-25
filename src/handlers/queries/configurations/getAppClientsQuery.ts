import { NextFunction, Response, Request } from "express";
import AppClient from "../../../models/AppClient";
import { Tenant } from "../../../models/Tenant";
import { CustomError } from "../../../middleware/error/errorHandler";

const getAppClientsQuery = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ message: "tenantId is required" });
    }

    const tenant = await Tenant.findOne({id: tenantId});

    if (!tenant) {
      const error = new Error("Tenant not exist") as CustomError;
      error.status = 401;
      error.code = "tenantNotExist";
      throw error;
    }

    const apps = await AppClient.find({ tenantId: tenantId })
      .sort({ isActive: -1, createdAt: -1 })
      .lean();
    
    res.status(200).json(apps);
  } catch (error) {
    console.error("Error fetching consumers:", error);
    next(error);
  }
};

export default getAppClientsQuery;
