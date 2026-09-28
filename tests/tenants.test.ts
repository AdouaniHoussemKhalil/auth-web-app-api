import request from "supertest";
import { createApp } from "../src/app";
import { templates } from "../src/services/email/models/Template";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import { Tenant } from "../src/models/Tenant";
import {
  PASSWORD,
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

describe("POST /tenants/register", () => {
  it("crée un tenant et retourne ses tokens", async () => {
    const tenant = await registerTenant(app);

    expect(tenant.tenantId).toEqual(expect.any(String));
    expect(tenant.accessToken).toEqual(expect.any(String));
  });

  it("refuse un e-mail déjà utilisé", async () => {
    await registerTenant(app);

    const res = await request(app).post("/tenants/register").send({
      firstName: "Alice",
      lastName: "Tenant",
      email: "tenant@test.com",
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("userAlreadyExists");
  });

  it("valide le corps de la requête", async () => {
    const res = await request(app)
      .post("/tenants/register")
      .send({ email: "not-an-email", password: "weak" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation Error");
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })])
    );
  });
});

describe("Connexion tenant en deux étapes", () => {
  it("refuse un mauvais mot de passe", async () => {
    await registerTenant(app);

    const res = await request(app)
      .post("/tenants/login")
      .send({ email: "tenant@test.com", password: "Wrong1!pass" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("invalidCredentials");
  });

  it("envoie un code par e-mail puis connecte avec ce code", async () => {
    await registerTenant(app);

    const login = await request(app)
      .post("/tenants/login")
      .send({ email: "tenant@test.com", password: PASSWORD });
    expect(login.status).toBe(200);

    const code = lastEmailVariable(templates.loginByCodeMFA.id);
    expect(code).toMatch(/^\d{6}$/);

    const res = await request(app)
      .post("/tenants/loginByMFACode")
      .send({ email: "tenant@test.com", mfaCode: code });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toEqual(expect.any(String));
  });

  it("refuse un code MFA invalide", async () => {
    await registerTenant(app);
    await request(app)
      .post("/tenants/login")
      .send({ email: "tenant@test.com", password: PASSWORD });

    const res = await request(app)
      .post("/tenants/loginByMFACode")
      .send({ email: "tenant@test.com", mfaCode: "000000" });

    expect(res.status).toBe(400);
  });
});

describe("Consultation des consumers par le tenant", () => {
  it("liste les consumers d'une application et affiche leur détail", async () => {
    const tenant = await registerTenant(app);
    const client = await createAppClient(app, tenant);
    const consumer = await registerConsumer(app, client);

    const list = await request(app)
      .get(`/tenants/${tenant.tenantId}/app/${client.appId}/consumers`)
      .set(tenantHeaders(tenant));
    expect(list.status).toBe(200);
    expect(list.body).toEqual([expect.objectContaining({ id: consumer.id })]);
    expect(list.body[0].password).toBeUndefined();

    const detail = await request(app)
      .get(`/tenants/${tenant.tenantId}/app/${client.appId}/consumers/${consumer.id}`)
      .set(tenantHeaders(tenant));
    expect(detail.status).toBe(200);
    expect(detail.body.email).toBe(consumer.email);
  });
});

describe("Tenant inscrit via Google", () => {
  it("indique d'utiliser la connexion Google au lieu d'une erreur serveur", async () => {
    await Tenant.create({
      id: "google-tenant",
      email: "google@test.com",
      firstName: "Gina",
      lastName: "Google",
      secretKey: "secret",
      isByGoogle: true,
    });

    const res = await request(app)
      .post("/tenants/login")
      .send({ email: "google@test.com", password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("useGoogleSignIn");
  });
});
