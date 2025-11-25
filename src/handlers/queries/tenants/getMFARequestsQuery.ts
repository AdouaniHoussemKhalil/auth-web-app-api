import { NextFunction, Response, Request } from "express";
import { MFARequest } from "../../../models/MFARequest";

const getMFARequestsQuery = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { appId, userId } = req.params;
    const mfaRequests = await MFARequest.find({
      userId: userId,
      appClientId: appId,
    });
    res.status(200).json(mfaRequests);
  } catch (error) {
    console.error("Error fetching MFA requests:", error);
    next(error);
  }
};

export default getMFARequestsQuery;
