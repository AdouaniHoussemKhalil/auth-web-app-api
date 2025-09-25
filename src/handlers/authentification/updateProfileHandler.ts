import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import User from "../../models/User";

const updateProfileHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { userId, newFirstName, newLastName } = request.body;

    if (!userId) {
      const error = new Error("UserId should not be empty") as CustomError;
      error.status = 400;
      error.code = "userIdIsNull";
      throw error;
    }

    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("User not exist") as CustomError;
      error.status = 401;
      error.code = "userNotExist";
      throw error;
    }

    if (newFirstName) user.firstName = newFirstName;
    if (newLastName) user.lastName = newLastName;
    user.save();

    return response.status(200).json({
      message: "User updated successfully",
      user,
      isSuccess: true
    });
  } catch (error) {
    next(error);
  }
};

export default updateProfileHandler;