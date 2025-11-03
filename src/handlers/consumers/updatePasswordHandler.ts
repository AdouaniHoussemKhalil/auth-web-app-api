import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import { compare, hash } from "../../services/hashing/hash";
import { Consumer } from "../../models/Consumer";

const updatePasswordHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { userId, currentPassword, password } = request.body;

    if (!password || !userId || !currentPassword) {
      const error = new Error(
        "Some required fields are missing"
      ) as CustomError;
      error.status = 400;
      throw error;
    }

    const user = await Consumer.findById(userId);

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
      isError: false,
    });
  } catch (error) {
    next(error);
  }
};

export default updatePasswordHandler;
