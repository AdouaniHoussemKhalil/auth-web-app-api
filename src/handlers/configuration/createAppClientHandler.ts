import { NextFunction, Request, Response } from "express";
import AppClient from "../../models/AppClient";
import { randomUUID } from "crypto";

const createAppClientHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, tokenExpiresIn, redirectUrl } = req.body;

    const newAppClient = await AppClient.create({
      name,
      tokenExpiresIn,
      redirectUrl,
      appId: randomUUID().toString(),
      secretKey: randomUUID().toString(),
      apiKey: randomUUID().toString(),
      isActive: true,
      branding: {
        appName: name,
        supportEmail: "<support-email@example.com>",
      },
    });

    return res.status(201).json({
      isSuccess: true,
      data: { appId: newAppClient.appId },
    });
  } catch (error) {
    next(error);
  }
};

export default createAppClientHandler;
