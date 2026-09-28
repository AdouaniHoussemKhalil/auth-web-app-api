import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { generateConsumerToken } from "../../../services/token/tokenService";
import { Consumer } from "../../../models/Consumer";
import { hash } from "../../../services/hashing/hash";
import { UserRole } from "../../../models/enums/UserRole";
import { sendEmailVerification } from "../../../services/email/sendEmailVerification";

const config = require("config");
const scopes = config.get("consumer.scopes");

const registerUserHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = request.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      const error = new Error("Some required fields are missing") as CustomError;
      error.status = 400;
      throw error;
    }

    const appClient = (request as any).appClient;

    if (await Consumer.findOne({ email, clientId: appClient.id })) {
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
      clientId: appClient.id,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      // Le rôle n'est jamais choisi par l'utilisateur final.
      role: UserRole.CONSUMER,
      scopes,
    });
    await newUser.save();

    await sendEmailVerification(newUser, appClient);

    const returnedUser: any = {
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role,
      scopes: scopes,
      isEmailVerified: false,
    };

    if (appClient.requireEmailVerification) {
      return response.status(201).json({
        message: "User registered, please verify your email",
        user: returnedUser,
        emailVerificationRequired: true,
        isSuccess: true,
      });
    }

    const { access_token, refresh_token } = await generateConsumerToken(
      { jwtPayload: returnedUser },
      appClient.id,
      newUser.id
    );

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
