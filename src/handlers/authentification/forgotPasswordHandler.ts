import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../middleware/error/errorHandler";
import User from "../../models/User";
import { generateResetCode } from "../../utils/generateToken";
import { sendMailAsync } from "../../services/email/sendMails";
import { Recipient } from "../../services/email/models/recipient";
import { hash } from "../../utils/password";


const forgotPasswordHandler = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { email } = request.body;

    if (!email) {
      const error = new Error("Missing required filds") as CustomError;
      error.status = 400;
      throw error;
    }

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User not exist") as CustomError;
      error.status = 401;
      error.code = "userNotExist";
      throw error;
    }

    const resetCode = generateResetCode();
    const recipient: Recipient = {
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
    };
    await sendMailAsync(recipient, resetCode);

    const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    const resetPasswordToken = await hash(resetCode);

    user.resetPassword = {
      resetPasswordToken,
      resetPasswordExpires
    }
    user.save();
    response.status(201).json({
      message: 'Reset code sent to your email',
      resetPasswordToken,
      isError: false
    });
  } catch (error) {
    next(error);
  }
};

export default forgotPasswordHandler;
