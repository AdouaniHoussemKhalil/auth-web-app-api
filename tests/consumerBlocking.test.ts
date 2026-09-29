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
  emailsSent,
  lastEmailVariable,
  registerConsumer,
  registerTenant,
  tenantHeaders,
} from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();

type Tenant = Awaited<ReturnType<typeof registerTenant>>;

let tenant: Tenant;
let client: AppClientCredentials;

beforeAll(connectTestDB);
beforeEach(async () => {
  tenant = await registerTenant(app);
  client = await createAppClient(app, tenant);
});
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const setStatus = (
  consumerId: string,
  isActive: unknown,
  by: Tenant = tenant,
  appId = client.appId
) =>
  request(app)
    .patch(`/tenants/${by.tenantId}/app/${appId}/consumers/${consumerId}`)
    .set(tenantHeaders(by))
    .send({ isActive });

const login = (email: string, password = PASSWORD) =>
  request(app).post("/consumers/auth/login").set(appHeaders(client)).send({ email, password });

describe("Blocage d'un consumer par le tenant", () => {
  it("bloque le consumer et ferme ses sessions", async () => {
    const consumer = await registerConsumer(app, client);
    const session = await login(consumer.email);

    const res = await setStatus(consumer.id, false);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: consumer.id, isActive: false });
    expect(res.body.data.password).toBeUndefined();

    const me = await request(app)
      .get(`/consumers/auth/me/${consumer.id}`)
      .set(consumerHeaders(client, { accessToken: session.body.access_token }));
    expect(me.status).toBe(403);

    const refresh = await request(app)
      .post("/consumers/auth/refresh")
      .set(appHeaders(client))
      .send({ refreshToken: session.body.refresh_token });
    expect(refresh.status).toBe(401);
  });

  it("refuse la connexion d'un consumer bloqué, sans le révéler sans mot de passe", async () => {
    const consumer = await registerConsumer(app, client);
    await setStatus(consumer.id, false);

    const blocked = await login(consumer.email);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("UserBlocked");

    const wrongPassword = await login(consumer.email, "Wrong1!pass");
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe("invalidCredentials");
  });

  it("refuse le code MFA d'un consumer bloqué entre-temps", async () => {
    const consumer = await registerConsumer(app, client);
    await Consumer.updateOne({ id: consumer.id }, { isMFAActivated: true });
    expect((await login(consumer.email)).body.MFARequired).toBe(true);

    await setStatus(consumer.id, false);
    const res = await request(app)
      .post("/consumers/auth/loginByMFA")
      .set(appHeaders(client))
      .send({ email: consumer.email, mfaCode: lastEmailVariable(templates.loginByCodeMFA.id) });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("UserBlocked");
  });

  it("n'envoie pas de code de réinitialisation à un consumer bloqué", async () => {
    const consumer = await registerConsumer(app, client);
    await setStatus(consumer.id, false);

    const res = await request(app)
      .post("/consumers/auth/forgotPassword")
      .set(appHeaders(client))
      .send({ email: consumer.email });

    // Même réponse que pour un e-mail inconnu.
    expect(res.status).toBe(201);
    expect(emailsSent(templates.forgotPassword.id)).toBe(0);
  });

  it("débloque le consumer", async () => {
    const consumer = await registerConsumer(app, client);
    await setStatus(consumer.id, false);

    const res = await setStatus(consumer.id, true);

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);
    expect((await login(consumer.email)).status).toBe(200);
  });

  it("valide le corps de la requête", async () => {
    const consumer = await registerConsumer(app, client);

    expect((await setStatus(consumer.id, "no")).status).toBe(400);
    expect((await setStatus("unknown-id", false)).status).toBe(404);
  });

  it("ne permet pas de bloquer le consumer d'un autre tenant", async () => {
    const consumer = await registerConsumer(app, client);
    const other = await registerTenant(app, "other@test.com");

    const res = await setStatus(consumer.id, false, other);

    // L'application n'appartient pas à ce tenant : elle n'existe pas pour lui.
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("appNotFound");
    expect((await Consumer.findOne({ id: consumer.id }))?.isActive).toBe(true);
  });
});
