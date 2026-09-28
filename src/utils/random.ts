import { randomBytes, randomInt } from "crypto";

export const randomSixDigitCode = (): string => randomInt(100000, 1000000).toString();

export const randomToken = (): string => randomBytes(32).toString("hex");
