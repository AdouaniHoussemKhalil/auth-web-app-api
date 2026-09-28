import { MongoMemoryServer } from "mongodb-memory-server";

export default async function globalSetup() {
  const mongo = await MongoMemoryServer.create({
    instance: {
      // MongoDB refuse de construire des index sous 500 Mo d'espace disque libre :
      // sur un poste presque plein, les tests d'index échouaient aléatoirement.
      args: ["--setParameter", "indexBuildMinAvailableDiskSpaceMB=0"],
    },
  });
  (globalThis as any).__MONGO__ = mongo;
  process.env.MONGO_URI = mongo.getUri();
}
