import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { Consumer } from "../../../models/Consumer";

const updateProfileHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { userId, newFirstName, newLastName } = request.body;

    const { id } = request.params;

    if (id !== userId) {
      const error = new Error("User ID in params does not match user ID in body") as CustomError;
      error.status = 400;
      error.code = "userIdMismatch";
      throw error;
    }

    if (!userId) {
      const error = new Error("UserId should not be empty") as CustomError;
      error.status = 400;
      error.code = "userIdIsNull";
      throw error;
    }

    const user = await Consumer.findOne({ id: userId, clientId: (request as any).appClient.id });

    if (!user) {
      const error = new Error("User not exist") as CustomError;
      error.status = 401;
      error.code = "userNotExist";
      throw error;
    }

    if (newFirstName) user.firstName = newFirstName;
    if (newLastName) user.lastName = newLastName;
    await user.save();

    const returnedUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };

    return response.status(200).json({
      message: "User updated successfully",
      user: returnedUser,
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default updateProfileHandler;
