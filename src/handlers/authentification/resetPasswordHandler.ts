import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import User from "../../models/User";
import { hashPassword } from "../../utils/hash";

const resetPasswordHandler = async (
    request: Request,
    response: Response,
    next: NextFunction
) => {
    try{
        const {userId, password, confirmPassword } = request.body;

        if( !password || !userId || !confirmPassword) {
            const error = new Error("Some required fields are missing") as CustomError;
            error.status = 400;
            throw error;
        }

        if(password !== confirmPassword) {
            const error = new Error("Passwords do not match") as CustomError;
            error.status = 400;
            error.code = "passwordsDoNotMatch";
            throw error;
        }

        const user = await User.findById(userId);

        if (!user) {
            const error = new Error("User not exist") as CustomError;
            error.status = 401;
            error.code = "userNotExist";
            throw error;
          }

        user.password = await hashPassword(password);
        user.save();

        return response.status(201).json({
            message : 'update password successfuly',
            isSuccess: true
        })
    }
    catch(error){
        next(error);
    }
}

export default resetPasswordHandler;