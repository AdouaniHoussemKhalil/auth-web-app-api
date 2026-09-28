import request from "supertest";
import { createApp } from "../src/app";
import { Tenant } from "../src/models/Tenant";
import { templates } from "../src/services/email/models/Template";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import {
  AppClientCredentials,
  PASSWORD,
  appHeaders,
  createAppClient,
  lastEmailVariable,
  registerConsumer,
  registerTenant,
  sentEmails,
} from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();
const NEW_PASSWORD = "NewPassword2@";

beforeAll(connectTestDB);
afterEach(async () => {
  await clearTestDB();
  sentEmails().mockClear();
});
afterAll(disconnectTestDB);

const forgot = (email = "tenant@test.com") =>
  request(app).post("/tenants/forgotPassword").send({ email });
const verify = (resetCode: string, email = "tenant@test.com") =>
  request(app).post("/tenants/verifyResetCode").send({ email, resetCode });
const reset = (resetToken: string, email = "tenant@test.com") =>
  request(app)
    .put("/tenants/resetPassword")
    .send({ email, resetToken, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
const login = (password: string) =>
  request(app).post("/tenants/login").send({ email: "tenant@test.com", password });

describe("Mot de passe oublié des tenants", () => {
  it("réinitialise le mot de passe et ferme les sessions existantes", async () => {
    // L'inscription ouvre une session : son refresh token doit être révoqué par la réinitialisation.
    const session = await request(app).post("/tenants/register").send({
      firstName: "Bob",
      lastName: "Tenant",
      email: "bob@test.com",
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });

    await forgot("bob@test.com");
    const verified = await verify(lastEmailVariable(templates.forgotPassword.id), "bob@test.com");
    expect(verified.status).toBe(201);

    const res = await reset(verified.body.resetToken, "bob@test.com");

    expect(res.status).toBe(201);
    const oldSession = await request(app)
      .post("/tenants/refresh")
      .send({ refreshToken: session.body.refresh_token });
    expect(oldSession.status).toBe(401);
    const newLogin = await request(app)
      .post("/tenants/login")
      .send({ email: "bob@test.com", password: NEW_PASSWORD });
    expect(newLogin.status).toBe(200);
  });

  it("refuse l'ancien mot de passe après réinitialisation", async () => {
    await registerTenant(app);
    await forgot();
    const verified = await verify(lastEmailVariable(templates.forgotPassword.id));
    await reset(verified.body.resetToken);

    expect((await login(PASSWORD)).status).toBe(401);
    expect((await login(NEW_PASSWORD)).status).toBe(200);
  });

  it("refuse un jeton de réinitialisation forgé ou réutilisé", async () => {
    await registerTenant(app);
    await forgot();
    const verified = await verify(lastEmailVariable(templates.forgotPassword.id));

    expect((await reset("forged")).status).toBe(400);
    expect((await reset(verified.body.resetToken)).status).toBe(201);
    expect((await reset(verified.body.resetToken)).status).toBe(400);
  });

  it("ne révèle pas si le compte existe", async () => {
    await registerTenant(app);

    const existing = await forgot();
    const unknown = await forgot("nobody@test.com");

    expect(unknown.status).toBe(201);
    expect(unknown.body).toEqual(existing.body);
    expect(sentEmails().mock.calls).toHaveLength(1);
  });

  it("permet à un compte Google de définir un mot de passe", async () => {
    await Tenant.create({
      id: "google-tenant",
      email: "tenant@test.com",
      firstName: "Gina",
      lastName: "Google",
      secretKey: "secret",
      isByGoogle: true,
    });

    await forgot();
    const verified = await verify(lastEmailVariable(templates.forgotPassword.id));
    await reset(verified.body.resetToken);

    expect((await login(NEW_PASSWORD)).status).toBe(200);
  });
});

describe("Réinitialisation du mot de passe d'un consumer", () => {
  it("ferme les sessions existantes", async () => {
    const client: AppClientCredentials = await createAppClient(app, await registerTenant(app));
    await registerConsumer(app, client);
    const session = await request(app)
      .post("/consumers/auth/login")
      .set(appHeaders(client))
      .send({ email: "user@test.com", password: PASSWORD });

    await request(app)
      .post("/consumers/auth/forgotPassword")
      .set(appHeaders(client))
      .send({ email: "user@test.com" });
    const verified = await request(app)
      .post("/consumers/auth/verifyResetCode")
      .set(appHeaders(client))
      .send({ email: "user@test.com", resetCode: lastEmailVariable(templates.forgotPassword.id) });
    await request(app).put("/consumers/auth/resetPassword").set(appHeaders(client)).send({
      email: "user@test.com",
      resetToken: verified.body.resetToken,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    const refresh = await request(app)
      .post("/consumers/auth/refresh")
      .set(appHeaders(client))
      .send({ refreshToken: session.body.refresh_token });
    expect(refresh.status).toBe(401);
  });
});
