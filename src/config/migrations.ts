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
};
