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

const refreshConsumer = (client: AppClientCredentials, refreshToken: string) =>
  request(app).post("/consumers/auth/refresh").set(appHeaders(client)).send({ refreshToken });

const loginConsumer = (client: AppClientCredentials, email = "user@test.com") =>
  request(app)
    .post("/consumers/auth/login")
    .set(appHeaders(client))
    .send({ email, password: PASSWORD });

describe("Refresh token consumer", () => {
  let client: AppClientCredentials;

  beforeEach(async () => {
    client = await createAppClient(app, await registerTenant(app));
    await registerConsumer(app, client);
  });

  it("délivre une nouvelle paire de tokens utilisable", async () => {
    const login = await loginConsumer(client);

    const res = await refreshConsumer(client, login.body.refresh_token);

    expect(res.status).toBe(200);
    expect(res.body.refresh_token).not.toBe(login.body.refresh_token);
    const me = await request(app)
      .get(`/consumers/auth/me/${login.body.user.id}`)
      .set(consumerHeaders(client, { accessToken: res.body.access_token }));
    expect(me.status).toBe(200);
  });

  it("refuse un refresh token déjà utilisé et révoque toute la session", async () => {
    const login = await loginConsumer(client);
    const rotated = await refreshConsumer(client, login.body.refresh_token);

    const replay = await refreshConsumer(client, login.body.refresh_token);

    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("invalidRefreshToken");
    expect((await refreshConsumer(client, rotated.body.refresh_token)).status).toBe(401);
  });

  it("refuse un access token à la place d'un refresh token", async () => {
    const login = await loginConsumer(client);

    expect((await refreshConsumer(client, login.body.access_token)).status).toBe(401);
  });

  it("révoque le refresh token à la déconnexion", async () => {
    const login = await loginConsumer(client);

    const logout = await request(app)
      .post("/consumers/auth/logout")
      .set(appHeaders(client))
      .send({ refreshToken: login.body.refresh_token });

    expect(logout.status).toBe(200);
    expect((await refreshConsumer(client, login.body.refresh_token)).status).toBe(401);
  });

  it("déconnecte toutes les sessions avec allDevices", async () => {
    const first = await loginConsumer(client);
    const second = await loginConsumer(client);

    await request(app)
      .post("/consumers/auth/logout")
      .set(appHeaders(client))
      .send({ refreshToken: first.body.refresh_token, allDevices: true });

    expect((await refreshConsumer(client, second.body.refresh_token)).status).toBe(401);
  });
});

describe("Refresh token tenant", () => {
  const registerWithTokens = () =>
    request(app).post("/tenants/register").send({
      firstName: "Alice",
      lastName: "Tenant",
      email: "tenant@test.com",
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });

  it("délivre une nouvelle paire puis la révoque à la déconnexion", async () => {
    const registered = await registerWithTokens();

    const refreshed = await request(app)
      .post("/tenants/refresh")
      .send({ refreshToken: registered.body.refresh_token });
    expect(refreshed.status).toBe(200);

    const apps = await request(app)
      .get(`/config/apps/${registered.body.tenantId}`)
      .set(
        tenantHeaders({
          tenantId: registered.body.tenantId,
          accessToken: refreshed.body.access_token,
        })
      );
    expect(apps.status).toBe(200);

    await request(app).post("/tenants/logout").send({ refreshToken: refreshed.body.refresh_token });
    const afterLogout = await request(app)
      .post("/tenants/refresh")
      .send({ refreshToken: refreshed.body.refresh_token });
    expect(afterLogout.status).toBe(401);
  });

  it("refuse un token illisible", async () => {
    const res = await request(app).post("/tenants/refresh").send({ refreshToken: "not-a-jwt" });

    expect(res.status).toBe(401);
  });
});

describe("Vérification de l'adresse e-mail", () => {
  it("envoie un code à l'inscription et marque l'e-mail comme vérifié", async () => {
    const client = await createAppClient(app, await registerTenant(app));
    const consumer = await registerConsumer(app, client);

    const res = await request(app)
      .post("/consumers/auth/verifyEmail")
      .set(appHeaders(client))
      .send({ email: consumer.email, code: lastEmailVariable(templates.emailVerification.id) });

    expect(res.status).toBe(200);
    const me = await request(app)
      .get(`/consumers/auth/me/${consumer.id}`)
      .set(consumerHeaders(client, consumer));
    expect(me.body.isEmailVerified).toBe(true);
  });

  it("bloque la connexion tant que l'e-mail n'est pas vérifié si l'application l'exige", async () => {
    const client = await createAppClient(app, await registerTenant(app), {
      requireEmailVerification: true,
    });

    const registered = await request(app)
      .post("/consumers/auth/register")
      .set(appHeaders(client))
      .send({
        firstName: "Bob",
        lastName: "Consumer",
        email: "user@test.com",
        password: PASSWORD,
        confirmPassword: PASSWORD,
      });
    expect(registered.status).toBe(201);
    expect(registered.body.emailVerificationRequired).toBe(true);
    expect(registered.body.access_token).toBeUndefined();

    const blocked = await loginConsumer(client);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("emailNotVerified");

    await request(app)
      .post("/consumers/auth/verifyEmail")
      .set(appHeaders(client))
      .send({ email: "user@test.com", code: lastEmailVariable(templates.emailVerification.id) });
    expect((await loginConsumer(client)).status).toBe(200);
  });

  it("renvoie un nouveau code sans révéler si le compte existe", async () => {
    const client = await createAppClient(app, await registerTenant(app));
    await registerConsumer(app, client);
    const firstCode = lastEmailVariable(templates.emailVerification.id);

    const existing = await request(app)
      .post("/consumers/auth/resendEmailVerification")
      .set(appHeaders(client))
      .send({ email: "user@test.com" });
    const unknown = await request(app)
      .post("/consumers/auth/resendEmailVerification")
      .set(appHeaders(client))
      .send({ email: "nobody@test.com" });

    expect(existing.body).toEqual(unknown.body);
    expect(sentEmails().mock.calls).toHaveLength(2);
    expect(lastEmailVariable(templates.emailVerification.id)).not.toBe(firstCode);
  });

  it("ignore le rôle envoyé par l'utilisateur final", async () => {
    const client = await createAppClient(app, await registerTenant(app));

    await request(app).post("/consumers/auth/register").set(appHeaders(client)).send({
      firstName: "Bob",
      lastName: "Consumer",
      email: "user@test.com",
      password: PASSWORD,
      confirmPassword: PASSWORD,
      role: "tenant",
    });

    expect((await Consumer.findOne({ email: "user@test.com" }))?.role).toBe("consumer");
  });
});

describe("Rotation du secret d'application", () => {
  it("remplace le secret et révoque les sessions des consumers", async () => {
    const tenant = await registerTenant(app);
    const client = await createAppClient(app, tenant);
    await registerConsumer(app, client);
    const login = await loginConsumer(client);

    const res = await request(app)
      .post(`/config/apps/${tenant.tenantId}/${client.appId}/rotate-secret`)
      .set(tenantHeaders(tenant));

    expect(res.status).toBe(200);
    const rotated = { appId: client.appId, secretKey: res.body.data.secretKey as string };
    expect(rotated.secretKey).not.toBe(client.secretKey);
    expect((await loginConsumer(client)).status).toBe(403);
    expect((await loginConsumer(rotated)).status).toBe(200);
    expect((await refreshConsumer(rotated, login.body.refresh_token)).status).toBe(401);
  });

  it("interdit la rotation du secret d'un autre tenant", async () => {
    const alice = await registerTenant(app, "alice@test.com");
    const bob = await registerTenant(app, "bob@test.com");
    const bobClient = await createAppClient(app, bob);

    const res = await request(app)
      .post(`/config/apps/${bob.tenantId}/${bobClient.appId}/rotate-secret`)
      .set(tenantHeaders(alice));

    expect(res.status).toBe(403);
  });
});
