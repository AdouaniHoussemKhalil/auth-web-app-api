import request from "supertest";
import { createApp } from "../src/app";
import { Consumer } from "../src/models/Consumer";
import { templates } from "../src/services/email/models/Template";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import {
  AppClientCredentials,
  PASSWORD,
  appHeaders,
  consumerHeaders,
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
  const tenant = await registerTenant(app);
  client = await createAppClient(app, tenant);
});
afterEach(async () => {
  await clearTestDB();
  sentEmails().mockClear();
});
afterAll(disconnectTestDB);

const login = (credentials: AppClientCredentials, email: string, password = PASSWORD) =>
  request(app).post("/consumers/auth/login").set(appHeaders(credentials)).send({ email, password });

describe("Inscription", () => {
  it("rattache le consumer à l'application et retourne ses tokens", async () => {
    const consumer = await registerConsumer(app, client);

    const stored = await Consumer.findOne({ id: consumer.id });
    expect(stored?.clientId).toBe(client.appId);
    expect(consumer.accessToken).toEqual(expect.any(String));
  });

  it("refuse un e-mail déjà inscrit dans la même application", async () => {
    await registerConsumer(app, client);

    const res = await request(app).post("/consumers/auth/register").set(appHeaders(client)).send({
      firstName: "Bob",
      lastName: "Consumer",
      email: "user@test.com",
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("userAlreadyExists");
  });

  it("accepte le même e-mail dans une autre application", async () => {
    const tenant = await registerTenant(app, "other-tenant@test.com");
    const otherClient = await createAppClient(app, tenant);
    await registerConsumer(app, client);

    await registerConsumer(app, otherClient);
  });
});

describe("Connexion", () => {
  it("retourne les tokens avec le bon mot de passe", async () => {
    await registerConsumer(app, client);

    const res = await login(client, "user@test.com");

    expect(res.status).toBe(200);
    expect(res.body.access_token).toEqual(expect.any(String));
  });

  it("ne connecte pas un consumer via une autre application", async () => {
    const tenant = await registerTenant(app, "other-tenant@test.com");
    const otherClient = await createAppClient(app, tenant);
    await registerConsumer(app, client);

    const res = await login(otherClient, "user@test.com");

    expect(res.status).toBe(401);
  });
});

describe("Mot de passe et profil", () => {
  it("envoie un code de réinitialisation et le vérifie", async () => {
    await registerConsumer(app, client);

    const forgot = await request(app)
      .post("/consumers/auth/forgotPassword")
      .set(appHeaders(client))
      .send({ email: "user@test.com" });
    expect(forgot.status).toBe(201);

    const res = await request(app)
      .post("/consumers/auth/verifyResetCode")
      .set(appHeaders(client))
      .send({ email: "user@test.com", resetCode: lastEmailVariable(templates.forgotPassword.id) });

    expect(res.status).toBe(201);
  });

  it("change le mot de passe", async () => {
    const consumer = await registerConsumer(app, client);
    const newPassword = "NewPassword2@";

    const res = await request(app)
      .put(`/consumers/auth/updatePassword/${consumer.id}`)
      .set(consumerHeaders(client, consumer))
      .send({
        userId: consumer.id,
        currentPassword: PASSWORD,
        password: newPassword,
        confirmPassword: newPassword,
      });

    expect(res.status).toBe(201);
    expect((await login(client, consumer.email, newPassword)).status).toBe(200);
  });

  it("met à jour le profil et ne renvoie pas le mot de passe", async () => {
    const consumer = await registerConsumer(app, client);

    const res = await request(app)
      .put(`/consumers/auth/updateProfile/${consumer.id}`)
      .set(consumerHeaders(client, consumer))
      .send({ userId: consumer.id, newFirstName: "Robert", newLastName: "Durand" });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: consumer.id,
      firstName: "Robert",
      lastName: "Durand",
      email: consumer.email,
    });
  });

  it("retourne le profil du consumer connecté", async () => {
    const consumer = await registerConsumer(app, client);

    const res = await request(app)
      .get(`/consumers/auth/me/${consumer.id}`)
      .set(consumerHeaders(client, consumer));

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(consumer.email);
  });
});

describe("MFA par code", () => {
  const requestMFA = (consumer: { accessToken: string; email: string }, requestType: string) =>
    request(app)
      .post("/consumers/auth/requestMFA")
      .set(consumerHeaders(client, consumer))
      .send({ email: consumer.email, requestType });

  it("active le MFA, l'exige à la connexion puis le désactive", async () => {
    const consumer = await registerConsumer(app, client);

    expect((await requestMFA(consumer, "activate")).status).toBe(200);
    const activation = await request(app)
      .post("/consumers/auth/activateMFA")
      .set(consumerHeaders(client, consumer))
      .send({ userId: consumer.id, activationId: lastEmailVariable(templates.activateMFA.id) });
    expect(activation.status).toBe(200);

    const loginRes = await login(client, consumer.email);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.MFARequired).toBe(true);
    expect(loginRes.body.access_token).toBeUndefined();

    const mfaLogin = await request(app)
      .post("/consumers/auth/loginByMFA")
      .set(appHeaders(client))
      .send({ email: consumer.email, mfaCode: lastEmailVariable(templates.loginByCodeMFA.id) });
    expect(mfaLogin.status).toBe(200);
    expect(mfaLogin.body.access_token).toEqual(expect.any(String));

    expect((await requestMFA(consumer, "deactivate")).status).toBe(200);
    const deactivation = await request(app)
      .post("/consumers/auth/deactivateMFA")
      .set(consumerHeaders(client, consumer))
      .send({
        userId: consumer.id,
        deactivationId: lastEmailVariable(templates.deactivateMFA.id),
      });
    expect(deactivation.status).toBe(200);

    expect((await login(client, consumer.email)).body.access_token).toEqual(expect.any(String));
  });

  it("refuse un code d'activation invalide", async () => {
    const consumer = await registerConsumer(app, client);
    await requestMFA(consumer, "activate");

    const res = await request(app)
      .post("/consumers/auth/activateMFA")
      .set(consumerHeaders(client, consumer))
      .send({ userId: consumer.id, activationId: "000000" });

    expect(res.status).toBe(400);
  });
});

describe("MFA par lien", () => {
  it("active le MFA avec l'identifiant contenu dans le lien", async () => {
    const tenant = await registerTenant(app, "link-tenant@test.com");
    const linkClient = await createAppClient(app, tenant, { mfaVerificationMode: "link" });
    const consumer = await registerConsumer(app, linkClient);

    const requested = await request(app)
      .post("/consumers/auth/requestMFA")
      .set(consumerHeaders(linkClient, consumer))
      .send({ email: consumer.email, requestType: "activate" });
    expect(requested.status).toBe(200);

    const link = new URL(lastEmailVariable(templates.mfaActivationRequest.id));
    const res = await request(app)
      .post("/consumers/auth/activateMFA")
      .set(consumerHeaders(linkClient, consumer))
      .send({ userId: consumer.id, activationId: link.searchParams.get("r") });

    expect(res.status).toBe(200);
  });
});
