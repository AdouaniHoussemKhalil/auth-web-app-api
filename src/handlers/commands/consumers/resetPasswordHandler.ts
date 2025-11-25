import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { Consumer } from "../../../models/Consumer";
import { hash } from "../../../services/hashing/hash";

const resetPasswordHandler = async (
    request: Request,
    response: Response,
    next: NextFunction
) => {
    try{
        const {email, password, confirmPassword } = request.body;

        if( !password || !email || !confirmPassword) {
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

        const user = await Consumer.findOne({ email });

        if (!user) {
            const error = new Error("User not exist") as CustomError;
            error.status = 401;
            error.code = "userNotExist";
            throw error;
          }

        user.password = await hash(password);
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