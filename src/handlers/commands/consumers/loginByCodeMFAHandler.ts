import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../middleware/error/errorHandler";
import { generateConsumerToken } from "../../../services/token/tokenService";
import { SecondaryUserAccessMethodType } from "../../../models/subdocuments/SecondaryAccessMethod";
import { Consumer } from "../../../models/Consumer";
import { consumeOneTimeCode } from "../../../services/security/oneTimeCode";

const loginByCodeMFAHandler = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { email, mfaCode } = request.body;
    const appId = (request as any).appClient.id;

    const user = await Consumer.findOne({ email, clientId: appId });
    if (!user) {
      const error = new Error("Invalid code") as CustomError;
      error.status = 400;
      error.code = "invalidCode";
      throw error;
    }

    await consumeOneTimeCode(user, SecondaryUserAccessMethodType.MFA, mfaCode);

    const returnedUser: any = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      scopes: user.scopes,
    };

    const { access_token, refresh_token } = await generateConsumerToken(
      { jwtPayload: returnedUser },
      appId,
      user.id
    );

    response.status(200).json({
      returnedUser,
      access_token,
      refresh_token,
      message: "MFA verified successfully",
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
};

export default loginByCodeMFAHandler;
