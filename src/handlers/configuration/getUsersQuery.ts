import { Request, Response, NextFunction } from "express";
import { IAppClient } from "../../models/AppClient";
import User from "../../models/User";

const getUsersQuery = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const appClient: IAppClient = (req as any).appClient;
        const users = await User.find({ appClientId: appClient.id });
        res.status(200).json(users.map(({ password, ...rest }) => rest));
    }catch(error){
        console.error("Error fetching users:", error);
        next(error);
    }
}

export default getUsersQuery;