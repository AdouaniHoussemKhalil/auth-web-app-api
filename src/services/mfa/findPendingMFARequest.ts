import { IAppClient } from "../../models/AppClient";
import { MFARequest } from "../../models/MFARequest";
import { MFARequestStatus } from "../../models/enums/MFARequestStatus";
import { MFARequestType } from "../../models/enums/MFARequestType";

// Retrouve la demande MFA en attente correspondant au code ou à l'identifiant de lien reçu.
export const findPendingMFARequest = (
  appClient: IAppClient,
  userId: string,
  type: MFARequestType,
  verificationValue: string
) => {
  const verificationMode = appClient.mfaSettings?.verificationMode === "link" ? "link" : "code";

  return MFARequest.findOne({
    userId,
    clientId: appClient.id,
    type,
    status: MFARequestStatus.PENDING,
    "verification.type": verificationMode,
    [verificationMode === "code" ? "verification.code" : "verification.linkId"]: verificationValue,
  }).sort({ createdAt: -1 });
};
