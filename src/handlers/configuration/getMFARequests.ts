import { NextFunction, Response, Request } from "express"
import { UserMFARequest } from "../../models/UserMFARequest";
import { IAppClient } from "../../models/AppClient";

const getMFARequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appClient: IAppClient = (req as any).appClient;
        const { userId } = req.body;
        const mfaRequests = await UserMFARequest.find({ userId: userId, appClientId: appClient.id });
        res.status(200).json(mfaRequests);
    } catch (error) {
        console.error("Error fetching MFA requests:", error);
        next(error);
    }
}

export default getMFARequests;
