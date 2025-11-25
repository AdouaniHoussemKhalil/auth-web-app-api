import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { generateConsumerToken } from "../../../services/token/tokenService";
import { Consumer } from "../../../models/Consumer";
import { hash } from "../../../services/hashing/hash";

const config = require("config");
const scopes = config.get("consumer.scopes");

const registerUserHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {

    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      role = "consumer",
    } = request.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      const error = new Error(
        "Some required fields are missing"
      ) as CustomError;
      error.status = 400;
      throw error;
    }

    const appClient = (request as any).appClient;


    if (await Consumer.findOne({ email, clientId: appClient.appId })) {
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

    const hashedPassword = await hash(password);
    const newUser = new Consumer({
      id: crypto.randomUUID(),
      clientId: appClient.appId,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      scopes
    });
    await newUser.save();

    const returnedUser: any = {
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role,
      scopes: scopes
    };

    const {access_token, refresh_token} = await generateConsumerToken({ jwtPayload: returnedUser }, appClient.appId);

    response.status(201).json({
      message: "User registered successfully",
      user: returnedUser,
      access_token,
      refresh_token,
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default registerUserHandler;
