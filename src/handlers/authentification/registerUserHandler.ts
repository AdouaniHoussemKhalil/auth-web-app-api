import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import User from "../../models/User";
import { hashPassword } from "../../utils/password";
import jwt, { Secret } from "jsonwebtoken";
import config from "config";
import { getUserData } from "../../utils/user";

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
      role = "user",
    } = request.body;

    if (!firstName || !lastName || !email || !password) {
      const error = new Error(
        "Some required fields are missing"
      ) as CustomError;
      error.status = 400;
      throw error;
    }

    if (await User.findOne({ email })) {
      const error = new Error("User already exists") as CustomError;
      error.status = 400;
      error.code = "userAlreadyExists";
      throw error;
    }

    const hashedPassword = await hashPassword(password);
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
    });
    await newUser.save();


    const returnedUser = getUserData(newUser);
    const secret_token : Secret = config.get("authentification.SECRET_TOKEN");
    const token = jwt.sign({jwtPayload: returnedUser }, secret_token, {
      expiresIn: "1h"
  });

    response.status(201).json({
      message: "User registered successfully",
      user: returnedUser,
      token,
      isSuccess: true
    });
  } catch (error) {
    next(error);
  }
};

export default registerUserHandler;
