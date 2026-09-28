import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../src/app";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import {
  AppClientCredentials,
  PASSWORD,
  appHeaders,
  consumerHeaders,
  createAppClient,
  registerConsumer,
  registerTenant,
  tenantHeaders,
} from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();
let client: AppClientCredentials;

beforeAll(connectTestDB);
beforeEach(async () => {
  client = await createAppClient(app, await registerTenant(app));
});
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const login = async () => {
  const res = await request(app)
    .post("/consumers/auth/login")
    .set(appHeaders(client))
    .send({ email: "user@test.com", password: PASSWORD });
  return res.body as { access_token: string; refresh_token: string; user: { id: string } };
};

const me = (session: { access_token: string; user: { id: string } }) =>
  request(app)
    .get(`/consumers/auth/me/${session.user.id}`)
    .set(consumerHeaders(client, { accessToken: session.access_token }));

describe("Révocation immédiate des access tokens", () => {
  beforeEach(async () => {
    await registerConsumer(app, client);
  });

  it("invalide l'access token de la session fermée, pas celui des autres", async () => {
    const phone = await login();
    const laptop = await login();

    await request(app)
      .post("/consumers/auth/logout")
      .set(appHeaders(client))
      .send({ refreshToken: phone.refresh_token });

    expect((await me(phone)).status).toBe(403);
    expect((await me(laptop)).status).toBe(200);
  });

  it("invalide tous les access tokens avec allDevices", async () => {
    const phone = await login();
    const laptop = await login();

    await request(app)
      .post("/consumers/auth/logout")
      .set(appHeaders(client))
      .send({ refreshToken: phone.refresh_token, allDevices: true });

    expect((await me(phone)).status).toBe(403);
    expect((await me(laptop)).status).toBe(403);
  });

  it("remplace l'access token lors du refresh", async () => {
    const session = await login();

    const refreshed = await request(app)
      .post("/consumers/auth/refresh")
      .set(appHeaders(client))
      .send({ refreshToken: session.refresh_token });

    expect((await me(session)).status).toBe(403);
    expect((await me({ ...session, access_token: refreshed.body.access_token })).status).toBe(200);
  });

  it("ferme les autres sessions au changement de mot de passe et en rouvre une", async () => {
    const other = await login();
    const current = await login();
    const newPassword = "NewPassword2@";

    const res = await request(app)
      .put(`/consumers/auth/updatePassword/${current.user.id}`)
      .set(consumerHeaders(client, { accessToken: current.access_token }))
      .send({
        userId: current.user.id,
        currentPassword: PASSWORD,
        password: newPassword,
        confirmPassword: newPassword,
      });

    expect(res.status).toBe(201);
    expect((await me(other)).status).toBe(403);
    expect((await me({ ...current, access_token: res.body.access_token })).status).toBe(200);
  });

  it("refuse un access token correctement signé mais sans session (émis avant ce mécanisme)", async () => {
    const session = await login();
    const { jwtPayload } = jwt.decode(session.access_token) as any;
    // Token signé comme le faisait l'ancien code : même clé dérivée du secret d'application, sans sid.
    const legacyToken = jwt.sign(
      { jwtPayload, appId: client.appId, type: "access" },
      createHash("sha256").update(`${client.secretKey}_access`).digest("hex"),
      { audience: "Demo App", expiresIn: "1h" }
    );

    const res = await me({ ...session, access_token: legacyToken });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("invalidToken");
  });
});

describe("Révocation côté tenant", () => {
  it("invalide l'access token du tenant à la déconnexion", async () => {
    const tenant = await registerTenant(app, "other-tenant@test.com");
    const listApps = () =>
      request(app).get(`/config/apps/${tenant.tenantId}`).set(tenantHeaders(tenant));

    expect((await listApps()).status).toBe(200);
    await request(app).post("/tenants/logout").send({ refreshToken: tenant.refreshToken });

    expect((await listApps()).status).toBe(403);
  });
});
