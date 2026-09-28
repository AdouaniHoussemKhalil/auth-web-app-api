import mongoose from "mongoose";
import AppClient from "../src/models/AppClient";
import { Consumer } from "../src/models/Consumer";
import { MFARequest } from "../src/models/MFARequest";
import { Tenant } from "../src/models/Tenant";
import { findDuplicates } from "../scripts/checkDuplicateIds";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";

beforeAll(async () => {
  await connectTestDB();
  await Promise.all([Tenant, Consumer, AppClient, MFARequest].map((model) => model.init()));
});
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const indexKeys = async (model: mongoose.Model<any>) =>
  (await model.collection.indexes()).map(({ key, unique }) => ({ key, unique: !!unique }));

const consumer = (overrides: Record<string, unknown> = {}) => ({
  id: "consumer-1",
  clientId: "app-1",
  firstName: "Bob",
  lastName: "Consumer",
  email: "bob@test.com",
  ...overrides,
});

describe("Index MongoDB", () => {
  it("rend les identifiants métier uniques", async () => {
    expect(await indexKeys(Tenant)).toContainEqual({ key: { id: 1 }, unique: true });
    expect(await indexKeys(Consumer)).toContainEqual({ key: { id: 1 }, unique: true });
    expect(await indexKeys(AppClient)).toContainEqual({ key: { id: 1 }, unique: true });
  });

  it("indexe les recherches fréquentes", async () => {
    expect(await indexKeys(MFARequest)).toContainEqual({
      key: { userId: 1, clientId: 1, type: 1, status: 1, createdAt: -1 },
      unique: false,
    });
    expect(await indexKeys(Consumer)).toContainEqual({
      key: { clientId: 1, isActive: -1, createdOn: -1 },
      unique: false,
    });
  });

  it("refuse deux consumers avec le même identifiant", async () => {
    await Consumer.create(consumer());

    await expect(
      Consumer.create(consumer({ clientId: "app-2", email: "other@test.com" }))
    ).rejects.toMatchObject({ code: 11000 });
  });
});

describe("Détection des doublons avant création des index", () => {
  it("signale les identifiants en double", async () => {
    // Base sans index, comme une base de production antérieure à ce changement.
    const legacyDb = mongoose.connection.useDb(`legacy_${Date.now()}`).db!;
    await legacyDb.collection("tenants").insertMany([
      { id: "dup", email: "a@test.com" },
      { id: "dup", email: "b@test.com" },
    ]);

    const report = await findDuplicates(legacyDb);

    expect(report).toEqual([
      expect.objectContaining({
        collection: "tenants",
        keys: ["id"],
        duplicates: [expect.anything()],
      }),
    ]);
    await legacyDb.dropDatabase();
  });
});
