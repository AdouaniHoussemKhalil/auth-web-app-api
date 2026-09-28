import express from "express";
import request from "supertest";
import { createApp } from "../src/app";
import { createRateLimiter } from "../src/middleware/security/rateLimiter";
import { Consumer } from "../src/models/Consumer";
import { MFARequest } from "../src/models/MFARequest";
import { templates } from "../src/services/email/models/Template";
import { MAX_CODE_ATTEMPTS } from "../src/services/security/oneTimeCode";
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
  tenantHeaders,
} from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();

beforeAll(connectTestDB);
afterEach(async () => {
  await clearTestDB();
  sentEmails().mockClear();
});
afterAll(disconnectTestDB);

const NEW_PASSWORD = "NewPassword2@";

const forgotPassword = (client: AppClientCredentials, email: string) =>
  request(app).post("/consumers/auth/forgotPassword").set(appHeaders(client)).send({ email });

const verifyResetCode = (client: AppClientCredentials, email: string, resetCode: string) =>
  request(app)
    .post("/consumers/auth/verifyResetCode")
    .set(appHeaders(client))
    .send({ email, resetCode });

const resetPassword = (client: AppClientCredentials, email: string, resetToken: string) =>
  request(app)
    .put("/consumers/auth/resetPassword")
    .set(appHeaders(client))
    .send({ email, resetToken, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });

const login = (client: AppClientCredentials, email: string, password: string) =>
  request(app).post("/consumers/auth/login").set(appHeaders(client)).send({ email, password });

describe("Réinitialisation du mot de passe", () => {
  let client: AppClientCredentials;

  beforeEach(async () => {
    client = await createAppClient(app, await registerTenant(app));
    await registerConsumer(app, client);
  });

  it("refuse de changer le mot de passe sans jeton valide", async () => {
    const res = await resetPassword(client, "user@test.com", "forged-token");

    expect(res.status).toBe(400);
    expect((await login(client, "user@test.com", PASSWORD)).status).toBe(200);
  });

  it("change le mot de passe avec le jeton obtenu après vérification du code", async () => {
    await forgotPassword(client, "user@test.com");
    const verified = await verifyResetCode(
      client,
      "user@test.com",
      lastEmailVariable(templates.forgotPassword.id)
    );

    const res = await resetPassword(client, "user@test.com", verified.body.resetToken);

    expect(res.status).toBe(201);
    expect((await login(client, "user@test.com", NEW_PASSWORD)).status).toBe(200);
  });

  it("n'accepte le jeton de réinitialisation qu'une seule fois", async () => {
    await forgotPassword(client, "user@test.com");
    const verified = await verifyResetCode(
      client,
      "user@test.com",
      lastEmailVariable(templates.forgotPassword.id)
    );
    await resetPassword(client, "user@test.com", verified.body.resetToken);

    const replay = await resetPassword(client, "user@test.com", verified.body.resetToken);

    expect(replay.status).toBe(400);
  });

  it("ne révèle ni le code ni l'existence du compte", async () => {
    const existing = await forgotPassword(client, "user@test.com");
    const unknown = await forgotPassword(client, "nobody@test.com");

    expect(existing.status).toBe(201);
    expect(unknown.status).toBe(201);
    expect(unknown.body).toEqual(existing.body);
    expect(JSON.stringify(existing.body)).not.toContain("$2");
  });
});

describe("Codes à usage unique", () => {
  it(`invalide le code après ${MAX_CODE_ATTEMPTS} tentatives échouées`, async () => {
    const client = await createAppClient(app, await registerTenant(app));
    await registerConsumer(app, client);
    await forgotPassword(client, "user@test.com");
    const code = lastEmailVariable(templates.forgotPassword.id);

    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
      const wrong = String((Number(code) + 1 + i) % 1000000).padStart(6, "0");
      expect((await verifyResetCode(client, "user@test.com", wrong)).status).toBe(400);
    }

    expect((await verifyResetCode(client, "user@test.com", code)).status).toBe(400);
  });

  it("stocke les codes MFA hachés", async () => {
    const client = await createAppClient(app, await registerTenant(app));
    const consumer = await registerConsumer(app, client);

    await request(app)
      .post("/consumers/auth/requestMFA")
      .set(consumerHeaders(client, consumer))
      .send({ email: consumer.email, requestType: "activate" });

    const stored = await MFARequest.findOne({ userId: consumer.id });
    expect(stored?.verification.code).not.toBe(lastEmailVariable(templates.activateMFA.id));
  });
});

describe("Connexion et inscription des tenants", () => {
  it("ne délivre aucun token avant la validation du code MFA", async () => {
    await registerTenant(app);

    const res = await request(app)
      .post("/tenants/login")
      .send({ email: "tenant@test.com", password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.MFARequired).toBe(true);
    expect(res.body.access_token).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("secretKey");
  });

  it("n'ouvre pas de session à l'inscription et n'expose jamais le secretKey", async () => {
    const res = await request(app).post("/tenants/register").send({
      firstName: "Alice",
      lastName: "Tenant",
      email: "tenant@test.com",
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(res.body.access_token).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("secretKey");

    const tenant = await registerTenant(app, "other@test.com");
    const payload = JSON.parse(
      Buffer.from(tenant.accessToken.split(".")[1], "base64url").toString()
    );
    expect(JSON.stringify(payload)).not.toContain("secretKey");
  });
});

describe("Cloisonnement entre tenants", () => {
  it("interdit l'accès aux applications d'un autre tenant", async () => {
    const alice = await registerTenant(app, "alice@test.com");
    const bob = await registerTenant(app, "bob@test.com");
    const bobClient = await createAppClient(app, bob);

    const byPath = await request(app).get(`/config/apps/${bob.tenantId}`).set(tenantHeaders(alice));
    const byAppId = await request(app)
      .get(`/tenants/${alice.tenantId}/app/${bobClient.appId}/consumers`)
      .set(tenantHeaders(alice));
    const byBody = await request(app).post("/config/apps/create").set(tenantHeaders(alice)).send({
      tenantId: bob.tenantId,
      name: "Intrusion",
      supportEmail: "x@test.com",
      redirectUrl: "https://x.com",
      resetPasswordUrl: "https://x.com/reset",
    });

    expect(byPath.status).toBe(403);
    expect(byAppId.status).toBe(404);
    expect(byBody.status).toBe(403);
  });
});

describe("Cloisonnement entre consumers", () => {
  it("interdit d'agir sur le compte d'un autre consumer", async () => {
    const client = await createAppClient(app, await registerTenant(app));
    const alice = await registerConsumer(app, client, "alice@test.com");
    const bob = await registerConsumer(app, client, "bob@test.com");
    const headers = consumerHeaders(client, alice);

    const profile = await request(app)
      .put(`/consumers/auth/updateProfile/${bob.id}`)
      .set(headers)
      .send({ userId: bob.id, newFirstName: "Hacked", newLastName: "Hacked" });
    const me = await request(app).get(`/consumers/auth/me/${bob.id}`).set(headers);
    const mfa = await request(app)
      .post("/consumers/auth/requestMFA")
      .set(headers)
      .send({ email: bob.email, requestType: "activate" });

    expect([profile.status, me.status, mfa.status]).toEqual([403, 403, 403]);
    expect((await Consumer.findOne({ id: bob.id }))?.firstName).toBe("Bob");
  });
});

describe("Protections HTTP", () => {
  it("renvoie le même message pour une application inconnue ou un mauvais secret", async () => {
    const client = await createAppClient(app, await registerTenant(app));

    const wrongSecret = await login({ ...client, secretKey: "wrong" }, "user@test.com", PASSWORD);
    const unknownApp = await login({ ...client, appId: "unknown" }, "user@test.com", PASSWORD);

    expect(wrongSecret.status).toBe(403);
    expect(unknownApp.body).toEqual(wrongSecret.body);
  });

  it("ajoute les en-têtes de sécurité", async () => {
    const res = await request(app).post("/tenants/login").send({});

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("limite le nombre de requêtes", async () => {
    const limited = express();
    limited.use(createRateLimiter({ windowMs: 60_000, max: 2 }));
    limited.get("/", (_req, res) => {
      res.send("ok");
    });

    await request(limited).get("/").expect(200);
    await request(limited).get("/").expect(200);
    await request(limited).get("/").expect(429);
  });
});
