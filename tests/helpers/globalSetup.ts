import { MongoMemoryServer } from "mongodb-memory-server";

export default async function globalSetup() {
  const mongo = await MongoMemoryServer.create();
  (globalThis as any).__MONGO__ = mongo;
  process.env.MONGO_URI = mongo.getUri();
}
