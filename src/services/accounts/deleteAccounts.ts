import AppClient from "../../models/AppClient";
import { Consumer } from "../../models/Consumer";
import { MFARequest } from "../../models/MFARequest";
import { RefreshToken } from "../../models/RefreshToken";
import { Tenant } from "../../models/Tenant";
import { logger } from "../../utils/logger";

/**
 * Supprime un consumer et toutes ses données : demandes MFA et sessions (ses access tokens deviennent
 * aussitôt invalides, puisqu'ils sont rattachés à ses sessions).
 */
export const deleteConsumerAccount = async (consumerId: string, clientId: string) => {
  await Promise.all([
    MFARequest.deleteMany({ userId: consumerId, clientId }),
    RefreshToken.deleteMany({ subjectType: "consumer", subjectId: consumerId, clientId }),
  ]);
  await Consumer.deleteOne({ id: consumerId, clientId });
};

/**
 * Supprime un tenant en cascade : ses applications, les consumers de ces applications, leurs demandes MFA
 * et toutes les sessions (tenant et consumers).
 */
export const deleteTenantAccount = async (tenantId: string) => {
  const appIds = (await AppClient.find({ tenantId }).select("id").lean()).map((app) => app.id);

  const [consumers] = await Promise.all([
    Consumer.deleteMany({ clientId: { $in: appIds } }),
    MFARequest.deleteMany({ clientId: { $in: appIds } }),
    RefreshToken.deleteMany({ subjectType: "consumer", clientId: { $in: appIds } }),
    RefreshToken.deleteMany({ subjectType: "tenant", subjectId: tenantId }),
  ]);
  await AppClient.deleteMany({ tenantId });
  await Tenant.deleteOne({ id: tenantId });

  logger.info(
    { tenantId, apps: appIds.length, consumers: consumers.deletedCount },
    "Tenant account deleted"
  );
};
