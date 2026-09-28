import { randomBytes, randomInt } from "crypto";

export const randomSixDigitCode = (): string => randomInt(100000, 1000000).toString();

export const randomToken = (): string => randomBytes(32).toString("hex");

// Secret d'application : 256 bits aléatoires (un UUID n'en contient que 122).
export const generateAppSecret = (): string => randomBytes(32).toString("hex");
