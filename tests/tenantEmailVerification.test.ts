import request from "supertest";
import { createApp } from "../src/app";
import { runMigrations } from "../src/config/migrations";
import { Tenant } from "../src/models/Tenant";
import { templates } from "../src/services/email/models/Template";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import { PASSWORD, lastEmailVariable, sentEmails } from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();

beforeAll(connectTestDB);
afterEach(async () => {
  await clearTestDB();
  sentEmails().mockClear();
});
afterAll(disconnectTestDB);

const register = (overrides: Record<string, unknown> = {}) =>
  request(app)
    .post("/tenants/register")
    .send({
      firstName: "Alice",
      lastName: "Tenant",
      email: "tenant@test.com",
      password: PASSWORD,
      confirmPassword: PASSWORD,
      ...overrides,
    });
const verifyEmail = (code: string) =>
  request(app).post("/tenants/verifyEmail").send({ email: "tenant@test.com", code });
const login = () =>
  request(app).post("/tenants/login").send({ email: "tenant@test.com", password: PASSWORD });

describe("Vérification de l'e-mail des tenants", () => {
  it("n'ouvre pas de session à l'inscription et bloque la connexion avant vérification", async () => {
    const registered = await register();

    expect(registered.status).toBe(201);
    expect(registered.body.emailVerificationRequired).toBe(true);
    expect(registered.body.access_token).toBeUndefined();

    const blocked = await login();
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("emailNotVerified");
  });

  it("ouvre une session à la vérification puis autorise la connexion", async () => {
    await register();

    expect((await verifyEmail("000000")).status).toBe(400);
    const verified = await verifyEmail(lastEmailVariable(templates.emailVerification.id));

    expect(verified.status).toBe(200);
    expect(verified.body.access_token).toEqual(expect.any(String));
    expect(verified.body.user.email).toBe("tenant@test.com");
    expect((await login()).status).toBe(200);
  });

  it("n'accepte le code qu'une fois", async () => {
    await register();
    const code = lastEmailVariable(templates.emailVerification.id);

    await verifyEmail(code);

    expect((await verifyEmail(code)).status).toBe(400);
  });

  it("renvoie un nouveau code sans révéler si le compte existe", async () => {
    await register();
    const firstCode = lastEmailVariable(templates.emailVerification.id);

    const existing = await request(app)
      .post("/tenants/resendEmailVerification")
      .send({ email: "tenant@test.com" });
    const unknown = await request(app)
      .post("/tenants/resendEmailVerification")
      .send({ email: "nobody@test.com" });

    expect(existing.body).toEqual(unknown.body);
    expect((await verifyEmail(firstCode)).status).toBe(400);
    expect((await verifyEmail(lastEmailVariable(templates.emailVerification.id))).status).toBe(200);
  });

  it("ignore le rôle envoyé par le client", async () => {
    await register({ role: "consumer" });

    expect((await Tenant.findOne({ email: "tenant@test.com" }))?.role).toBe("tenant");
  });
});

describe("Migration des tenants existants", () => {
  it("considère comme vérifiés les tenants créés avant la vérification d'e-mail", async () => {
    await Tenant.collection.insertOne({
      id: "legacy-tenant",
      email: "legacy@test.com",
      firstName: "Old",
      lastName: "Tenant",
      secretKey: "secret",
      scopes: [],
      role: "tenant",
    });
    await register();

    await runMigrations();

    expect((await Tenant.findOne({ id: "legacy-tenant" }))?.isEmailVerified).toBe(true);
    expect((await Tenant.findOne({ email: "tenant@test.com" }))?.isEmailVerified).toBe(false);
  });
});
