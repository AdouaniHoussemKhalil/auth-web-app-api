import { createHash, timingSafeEqual } from "crypto";
import { CustomError } from "../../middleware/error/errorHandler";
import { IUser } from "../../models/User";
import { SecondaryUserAccessMethodType } from "../../models/subdocuments/SecondaryAccessMethod";
import { compare, hash } from "../hashing/hash";

export const MAX_CODE_ATTEMPTS = 5;

const codeError = (message: string, code: string) => {
  const error = new Error(message) as CustomError;
  error.status = 400;
  error.code = code;
  return error;
};

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const safeEqual = (a: string, b: string) => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
};

// Enregistre un code à usage unique (haché) sur l'utilisateur. Ne sauvegarde pas.
export const setOneTimeCode = async (
  user: IUser,
  type: SecondaryUserAccessMethodType,
  code: string,
  expiresInMs: number
) => {
  user.secondaryUserAccess = {
    code: await hash(code),
    expires: new Date(Date.now() + expiresInMs),
    type,
    attempts: 0,
  };
};

/**
 * Vérifie un code à usage unique : type, expiration et nombre de tentatives.
 * Le code est consommé en cas de succès ; il est invalidé après MAX_CODE_ATTEMPTS échecs.
 */
export const consumeOneTimeCode = async (
  user: IUser,
  type: SecondaryUserAccessMethodType,
  code: string
) => {
  const access = user.secondaryUserAccess;

  if (!access?.code || !access.expires || access.type !== type) {
    throw codeError("No pending code", "noPendingCode");
  }

  if (Date.now() > access.expires.getTime()) {
    user.secondaryUserAccess = undefined;
    await user.save();
    throw codeError("Expired code", "expiredCode");
  }

  if (!(await compare(code, access.code))) {
    const attempts = (access.attempts ?? 0) + 1;
    if (attempts >= MAX_CODE_ATTEMPTS) {
      user.secondaryUserAccess = undefined;
    } else {
      access.attempts = attempts;
    }
    await user.save();
    throw codeError("Invalid code", "invalidCode");
  }

  user.secondaryUserAccess = undefined;
  await user.save();
};
