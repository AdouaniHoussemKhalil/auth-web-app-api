import mongoose from "mongoose";

// Une base par fichier de test : les fichiers Jest tournent en parallèle.
export const connectTestDB = async () => {
  const dbName = `test_${process.env.JEST_WORKER_ID}_${Date.now()}`;
  await mongoose.connect(process.env.MONGO_URI as string, { dbName });
};

export const clearTestDB = async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

export const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};
