import request from "supertest";
import { createApp } from "../src/app";
import { Consumer } from "../src/models/Consumer";
import { SecondaryUserAccessMethodType } from "../src/models/subdocuments/SecondaryAccessMethod";
import { templates } from "../src/services/email/models/Template";
import { hash } from "../src/services/hashing/hash";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import {
  AppClientCredentials,
  appHeaders,
  createAppClient,
  lastEmailVariable,
  registerConsumer,
  registerTenant,
  sentEmails,
} from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();
let client: AppClientCredentials;

beforeAll(connectTestDB);
beforeEach(async () => {
  client = await createAppClient(app, await registerTenant(app));
});
afterEach(async () => {
  await clearTestDB();
  sentEmails().mockClear();
});
afterAll(disconnectTestDB);

const verifyResetCode = (resetCode: string) =>
  request(app)
    .post("/consumers/auth/verifyResetCode")
    .set(appHeaders(client))
    .send({ email: "user@test.com", resetCode });

describe("Un code en attente par type", () => {
  it("garde le code de vérification d'e-mail quand un code de mot de passe oublié est demandé", async () => {
    await registerConsumer(app, client);
    const emailCode = lastEmailVariable(templates.emailVerification.id);

    await request(app)
      .post("/consumers/auth/forgotPassword")
      .set(appHeaders(client))
      .send({ email: "user@test.com" });
    const resetCode = lastEmailVariable(templates.forgotPassword.id);

    const verifiedEmail = await request(app)
      .post("/consumers/auth/verifyEmail")
      .set(appHeaders(client))
      .send({ email: "user@test.com", code: emailCode });

    expect(verifiedEmail.status).toBe(200);
    expect((await verifyResetCode(resetCode)).status).toBe(201);
  });

  it("remplace le code précédent du même type", async () => {
    await registerConsumer(app, client);
    const forgot = () =>
      request(app)
        .post("/consumers/auth/forgotPassword")
        .set(appHeaders(client))
        .send({ email: "user@test.com" });

    await forgot();
    const firstCode = lastEmailVariable(templates.forgotPassword.id);
    await forgot();
    const secondCode = lastEmailVariable(templates.forgotPassword.id);

    expect((await verifyResetCode(firstCode)).status).toBe(400);
    expect((await verifyResetCode(secondCode)).status).toBe(201);
  });

  it("accepte un code stocké dans l'ancien champ unique (émis avant la migration)", async () => {
    await registerConsumer(app, client);
    await Consumer.updateOne(
      { email: "user@test.com" },
      {
        $set: {
          oneTimeCodes: {},
          secondaryUserAccess: {
            code: await hash("123456"),
            expires: new Date(Date.now() + 60_000),
            type: SecondaryUserAccessMethodType.ForgotPassword,
            attempts: 0,
          },
        },
      }
    );

    expect((await verifyResetCode("123456")).status).toBe(201);
    const stored = await Consumer.findOne({ email: "user@test.com" });
    expect(stored?.secondaryUserAccess?.code).toBeUndefined();
  });
});
