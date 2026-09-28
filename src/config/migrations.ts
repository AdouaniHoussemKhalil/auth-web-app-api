import AppClient from "../models/AppClient";
import { Tenant } from "../models/Tenant";
import { logger } from "../utils/logger";

/**
 * Migrations de données idempotentes, exécutées à chaque démarrage (sans effet une fois appliquées).
 */
export const runMigrations = async () => {
  // Vérification d'e-mail des tenants (#22) : les tenants créés avant son introduction n'ont pas le champ
  // et sont considérés comme vérifiés, pour ne pas les bloquer à la connexion.
  const { modifiedCount } = await Tenant.updateMany(
    { isEmailVerified: { $exists: false } },
    { $set: { isEmailVerified: true } }
  );
  if (modifiedCount) {
    logger.info({ count: modifiedCount }, "Existing tenants marked as email-verified");
  }

  // Mode MFA « both » retiré (#26) : il n'a jamais été géré et se comportait déjà comme « code ».
  // updateMany direct : la validation du modèle refuserait désormais cette valeur.
  const both = await AppClient.collection.updateMany(
    { "mfaSettings.verificationMode": "both" },
    { $set: { "mfaSettings.verificationMode": "code" } }
  );
  if (both.modifiedCount) {
    logger.info({ count: both.modifiedCount }, "MFA mode 'both' replaced by 'code'");
  }
};
