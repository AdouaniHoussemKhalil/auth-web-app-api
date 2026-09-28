import request from "supertest";
import { createApp } from "../src/app";
import { Consumer } from "../src/models/Consumer";
import { Tenant } from "../src/models/Tenant";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import {
  AppClientCredentials,
  appHeaders,
  consumerHeaders,
  createAppClient,
  registerConsumer,
  registerTenant,
  tenantHeaders,
} from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

// Les scopes sont lus dans le token : après un changement en base, un nouveau token est nécessaire.
const withoutScope = async (model: typeof Tenant | typeof Consumer, id: string, scope: string) =>
  (model as any).updateOne({ id }, { $pull: { scopes: scope } });

describe("Scopes des tenants", () => {
  it("refuse une action dont le scope a été retiré", async () => {
    const tenant = await registerTenant(app);
    await withoutScope(Tenant, tenant.tenantId, "app:create");
    const refreshed = await request(app)
      .post("/tenants/refresh")
      .send({ refreshToken: tenant.refreshToken });
    const headers = tenantHeaders({ ...tenant, accessToken: refreshed.body.access_token });

    const create = await request(app).post("/config/apps/create").set(headers).send({
      tenantId: tenant.tenantId,
      name: "Demo App",
      supportEmail: "support@demo.com",
      redirectUrl: "https://demo.com",
      resetPasswordUrl: "https://demo.com/reset",
    });
    const list = await request(app).get(`/config/apps/${tenant.tenantId}`).set(headers);

    expect(create.status).toBe(403);
    expect(create.body.error.code).toBe("insufficientScope");
    expect(list.status).toBe(200);
  });

  it("exige consumer:read pour consulter les consumers", async () => {
    const tenant = await registerTenant(app);
    const client = await createAppClient(app, tenant);
    await withoutScope(Tenant, tenant.tenantId, "consumer:read");
    const refreshed = await request(app)
      .post("/tenants/refresh")
      .send({ refreshToken: tenant.refreshToken });

    const res = await request(app)
      .get(`/tenants/${tenant.tenantId}/app/${client.appId}/consumers`)
      .set(tenantHeaders({ ...tenant, accessToken: refreshed.body.access_token }));

    expect(res.status).toBe(403);
  });
});

describe("Scopes des consumers", () => {
  let client: AppClientCredentials;

  beforeEach(async () => {
    client = await createAppClient(app, await registerTenant(app));
  });

  const reconnect = async () => {
    const login = await request(app)
      .post("/consumers/auth/login")
      .set(appHeaders(client))
      .send({ email: "user@test.com", password: "Password1!" });
    return { accessToken: login.body.access_token as string };
  };

  it("exige consumer:updateProfile pour modifier le profil", async () => {
    const consumer = await registerConsumer(app, client);
    await withoutScope(Consumer, consumer.id, "consumer:updateProfile");

    const res = await request(app)
      .put(`/consumers/auth/updateProfile/${consumer.id}`)
      .set(consumerHeaders(client, await reconnect()))
      .send({ userId: consumer.id, newFirstName: "Robert", newLastName: "Durand" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("insufficientScope");
  });

  it("choisit le scope MFA selon le type de demande", async () => {
    const consumer = await registerConsumer(app, client);
    await withoutScope(Consumer, consumer.id, "consumer:activateMFA");
    const headers = consumerHeaders(client, await reconnect());
    const requestMFA = (requestType: string) =>
      request(app)
        .post("/consumers/auth/requestMFA")
        .set(headers)
        .send({ email: consumer.email, requestType });

    expect((await requestMFA("activate")).status).toBe(403);
    // Le scope de désactivation est présent : la demande passe le contrôle (refusée ensuite car le MFA est inactif).
    expect((await requestMFA("deactivate")).body.error.code).not.toBe("insufficientScope");
  });
});
