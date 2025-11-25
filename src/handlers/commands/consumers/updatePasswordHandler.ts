import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { compare, hash } from "../../../services/hashing/hash";
import { Consumer } from "../../../models/Consumer";

const updatePasswordHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { id } = request.params;
    const { userId ,currentPassword, password, confirmPassword } = request.body;

    if (!password || !userId ||  !id || !currentPassword || !confirmPassword) {
      const error = new Error(
        "Some required fields are missing"
      ) as CustomError;
      error.status = 400;
      throw error;
    }

    if (id !== userId) {
      const error = new Error("User ID mismatch") as CustomError;
      error.status = 400;
      error.code = "userIdMismatch";
      throw error;
    }

    if (password !== confirmPassword) {
      const error = new Error("Passwords do not match") as CustomError;
      error.status = 400;
      error.code = "passwordsDoNotMatch";
      throw error;
    }

    const user = await Consumer.findOne({ id: userId });

    if (!user) {
      const error = new Error("User not exist") as CustomError;
      error.status = 401;
      error.code = "userNotExist";
      throw error;
    }

    const isCurrentPasswordValid = await compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      const error = new Error("current password is not correct") as CustomError;
      error.status = 400;
      error.code = "currentPasswordNotCorrect";
      throw error;
    }

    user.password = await hash(password);
    user.save();

    return response.status(201).json({
      message: "update password successfuly",
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default updatePasswordHandler;
