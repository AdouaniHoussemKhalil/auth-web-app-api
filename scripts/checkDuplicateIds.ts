/**
 * Vérifie qu'aucun doublon n'empêche la création des index uniques.
 * À lancer sur une base existante avant de déployer : npm run db:check-duplicates
 */
import config from "config";
import mongoose from "mongoose";

const checks = [
  { collection: "tenants", keys: ["id"] },
  { collection: "tenants", keys: ["email"] },
  { collection: "consumers", keys: ["id"] },
  { collection: "consumers", keys: ["clientId", "email"] },
  { collection: "appclients", keys: ["id"] },
];

export const findDuplicates = async (db: mongoose.mongo.Db) => {
  const report: { collection: string; keys: string[]; duplicates: unknown[] }[] = [];

  for (const { collection, keys } of checks) {
    const duplicates = await db
      .collection(collection)
      .aggregate([
        { $group: { _id: Object.fromEntries(keys.map((k) => [k, `$${k}`])), count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    if (duplicates.length) report.push({ collection, keys, duplicates });
  }

  return report;
};

const main = async () => {
  await mongoose.connect(config.get<string>("db.uri"));
  const report = await findDuplicates(mongoose.connection.db!);
  await mongoose.disconnect();

  if (!report.length) {
    console.info("Aucun doublon : les index uniques peuvent être créés.");
    return;
  }

  for (const { collection, keys, duplicates } of report) {
    console.error(`${collection} (${keys.join(", ")}) : ${duplicates.length} valeur(s) en double`);
    console.error(JSON.stringify(duplicates, null, 2));
  }
  process.exitCode = 1;
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
