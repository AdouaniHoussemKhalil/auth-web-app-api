import { CustomError } from "../../middleware/error/errorHandler";
import { IAppClient } from "../../models/AppClient";
import { MFARequest } from "../../models/MFARequest";
import { MFARequestStatus } from "../../models/enums/MFARequestStatus";
import { MFARequestType } from "../../models/enums/MFARequestType";
import { compare } from "../hashing/hash";
import { MAX_CODE_ATTEMPTS, safeEqual, sha256 } from "../security/oneTimeCode";

const invalidRequest = () => {
  const error = new Error("Invalid or expired verification") as CustomError;
  error.status = 400;
  error.code = "invalidMfaVerification";
  return error;
};

// Une seule demande en attente par utilisateur et par type : les précédentes expirent.
export const expirePendingMFARequests = (clientId: string, userId: string, type: MFARequestType) =>
  MFARequest.updateMany(
    { clientId, userId, type, status: MFARequestStatus.PENDING },
    { status: MFARequestStatus.EXPIRED }
  );

/**
 * Vérifie le code (haché avec bcrypt) ou l'identifiant de lien (haché en SHA-256) de la dernière
 * demande en attente. Invalide la demande à l'expiration ou après MAX_CODE_ATTEMPTS échecs.
 * Retourne la demande, encore en attente : l'appelant la passe à COMPLETED.
 */
export const verifyMFARequest = async (
  appClient: IAppClient,
  userId: string,
  type: MFARequestType,
  verificationValue: string
) => {
  const request = await MFARequest.findOne({
    userId,
    clientId: appClient.id,
    type,
    status: MFARequestStatus.PENDING,
  }).sort({ createdAt: -1 });

  if (!request) throw invalidRequest();

  if (Date.now() > request.expiresAt.getTime()) {
    request.status = MFARequestStatus.EXPIRED;
    await request.save();
    throw invalidRequest();
  }

  const { verification } = request;
  const isValid =
    verification.type === "link"
      ? !!verification.linkId && safeEqual(sha256(verificationValue), verification.linkId)
      : !!verification.code && (await compare(verificationValue, verification.code));

  if (!isValid) {
    request.attempts = (request.attempts ?? 0) + 1;
    if (request.attempts >= MAX_CODE_ATTEMPTS) request.status = MFARequestStatus.EXPIRED;
    await request.save();
    throw invalidRequest();
  }

  return request;
};
