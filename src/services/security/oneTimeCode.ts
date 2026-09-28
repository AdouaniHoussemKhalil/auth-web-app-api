import { createHash, timingSafeEqual } from "crypto";
import { CustomError } from "../../middleware/error/errorHandler";
import { IUser, PendingCode } from "../../models/User";
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

const codesOf = (user: IUser) => {
  if (!user.oneTimeCodes) user.oneTimeCodes = new Map();
  return user.oneTimeCodes;
};

// Code en attente pour ce type ; l'ancien emplacement unique est encore lu pour les codes émis avant la migration.
const pendingCodeOf = (
  user: IUser,
  type: SecondaryUserAccessMethodType
): PendingCode | undefined => {
  const pending = user.oneTimeCodes?.get(type);
  if (pending) return pending;

  const legacy = user.secondaryUserAccess;
  if (legacy?.type === type && legacy.code && legacy.expires) {
    return { code: legacy.code, expires: legacy.expires, attempts: legacy.attempts ?? 0 };
  }
  return undefined;
};

const clearCode = (user: IUser, type: SecondaryUserAccessMethodType) => {
  codesOf(user).delete(type);
  if (user.secondaryUserAccess?.type === type) user.secondaryUserAccess = undefined;
};

/**
 * Enregistre un code à usage unique (haché) pour ce type. Remplace le code précédent du même type
 * sans toucher aux codes des autres types. Ne sauvegarde pas.
 */
export const setOneTimeCode = async (
  user: IUser,
  type: SecondaryUserAccessMethodType,
  code: string,
  expiresInMs: number
) => {
  clearCode(user, type);
  codesOf(user).set(type, {
    code: await hash(code),
    expires: new Date(Date.now() + expiresInMs),
    attempts: 0,
  });
};

/**
 * Vérifie le code en attente pour ce type : expiration et nombre de tentatives.
 * Le code est consommé en cas de succès ; il est invalidé après MAX_CODE_ATTEMPTS échecs.
 */
export const consumeOneTimeCode = async (
  user: IUser,
  type: SecondaryUserAccessMethodType,
  code: string
) => {
  const pending = pendingCodeOf(user, type);

  if (!pending) {
    throw codeError("No pending code", "noPendingCode");
  }

  if (Date.now() > pending.expires.getTime()) {
    clearCode(user, type);
    await user.save();
    throw codeError("Expired code", "expiredCode");
  }

  if (!(await compare(code, pending.code))) {
    const attempts = pending.attempts + 1;
    clearCode(user, type);
    if (attempts < MAX_CODE_ATTEMPTS) {
      codesOf(user).set(type, { code: pending.code, expires: pending.expires, attempts });
    }
    await user.save();
    throw codeError("Invalid code", "invalidCode");
  }

  clearCode(user, type);
  await user.save();
};
