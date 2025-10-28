import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import User from "../../models/User";
import { hashPassword } from "../../utils/hash";
import config from "config";
import { generateUserToken } from "../../services/token/tokenService";

const registerUserHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const appId = (request as any).appClient.appId;

    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      role = "user",
    } = request.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      const error = new Error(
        "Some required fields are missing"
      ) as CustomError;
      error.status = 400;
      throw error;
    }

    const appClient = (request as any).appClient;


    if (await User.findOne({ email, clientId: appClient.appId })) {
      const error = new Error("User already exists") as CustomError;
      error.status = 400;
      error.code = "userAlreadyExists";
      throw error;
    }

    if (password !== confirmPassword) {
      const error = new Error("Passwords do not match") as CustomError;
      error.status = 400;
      error.code = "passwordsDoNotMatch";
      throw error;
    }

    const hashedPassword = await hashPassword(password);
    const newUser = new User({
      clientId: appId,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
    });
    await newUser.save();

    const returnedUser: any = {
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role,
    };

    const isDev = returnedUser.role === "developer";
    const token = await generateUserToken({ jwtPayload: returnedUser }, isDev, appId);

    response.status(201).json({
      message: "User registered successfully",
      user: returnedUser,
      token,
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default registerUserHandler;
