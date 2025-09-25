import { NextFunction, Request, Response } from "express";
import User from "../../models/User";
import { CustomError } from "../../middleware/error/errorHandler";
import { comparePassword } from "../../utils/password";
import jwt, { Secret } from "jsonwebtoken";
import config from "config";
import { getUserData } from "../../utils/user";

const loginUserHandler = async (
    request: Request,
    response: Response,
    next: NextFunction
)  => {
    try{
        const {email, password} = request.body;
        if (!email || !password) {
            const error = new Error("Missing required filds") as CustomError;
            error.status = 400;
            throw error;
        }
    
        const user = await User.findOne({email});
        if(!user){
            const error = new Error("Invalid email or password") as CustomError;
            error.status = 401;
            error.code = "invalidCredentials";
            throw error;
        }
    
        const isPasswordValid = await comparePassword(password, user.password);
    
        if(!isPasswordValid){
            const error = new Error("Invalid email or password") as CustomError;
            error.status = 401;
            error.code = "invalidCredentials";
            throw error;
        }

        const secret_token : Secret = config.get("authentification.SECRET_TOKEN");

        const returnedUser = getUserData(user);

        const token = jwt.sign({jwtPayload: returnedUser }, secret_token, {
            expiresIn: "1h"
        });
        
        response.status(201).json({
            token,
            user: returnedUser,
            isSuccess: true
        })

    }catch(error){
        next(error);
    }
}

export default loginUserHandler;