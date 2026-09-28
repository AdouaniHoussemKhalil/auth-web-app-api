import request from "supertest";
import { createApp } from "../src/app";
import AppClient from "../src/models/AppClient";
import { Consumer } from "../src/models/Consumer";
import { MFARequest } from "../src/models/MFARequest";
import { RefreshToken } from "../src/models/RefreshToken";
import { Tenant } from "../src/models/Tenant";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import {
  PASSWORD,
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

describe("Suppression de son compte par un consumer", () => {
  it("supprime le compte, ses demandes MFA et ses sessions", async () => {
    const client = await createAppClient(app, await registerTenant(app));
    const consumer = await registerConsumer(app, client);
    await request(app)
      .post("/consumers/auth/requestMFA")
      .set(consumerHeaders(client, consumer))
      .send({ email: consumer.email, requestType: "activate" });

    const res = await request(app)
      .delete(`/consumers/auth/me/${consumer.id}`)
      .set(consumerHeaders(client, consumer))
      .send({ password: PASSWORD });

    expect(res.status).toBe(200);
    expect(await Consumer.exists({ id: consumer.id })).toBeNull();
    expect(await MFARequest.countDocuments({ userId: consumer.id })).toBe(0);
    expect(await RefreshToken.countDocuments({ subjectId: consumer.id })).toBe(0);
  });

  it("exige le mot de passe", async () => {
    const client = await createAppClient(app, await registerTenant(app));
    const consumer = await registerConsumer(app, client);

    const res = await request(app)
      .delete(`/consumers/auth/me/${consumer.id}`)
      .set(consumerHeaders(client, consumer))
      .send({ password: "Wrong1!pass" });

    expect(res.status).toBe(401);
    expect(await Consumer.exists({ id: consumer.id })).not.toBeNull();
  });

  it("interdit de supprimer le compte d'un autre consumer", async () => {
    const client = await createAppClient(app, await registerTenant(app));
    const alice = await registerConsumer(app, client, "alice@test.com");
    const bob = await registerConsumer(app, client, "bob@test.com");

    const res = await request(app)
      .delete(`/consumers/auth/me/${bob.id}`)
      .set(consumerHeaders(client, alice))
      .send({ password: PASSWORD });

    expect(res.status).toBe(403);
    expect(await Consumer.exists({ id: bob.id })).not.toBeNull();
  });
});

describe("Suppression d'un consumer par le tenant", () => {
  it("supprime le consumer d'une de ses applications", async () => {
    const tenant = await registerTenant(app);
    const client = await createAppClient(app, tenant);
    const consumer = await registerConsumer(app, client);
    const remove = () =>
      request(app)
        .delete(`/tenants/${tenant.tenantId}/app/${client.appId}/consumers/${consumer.id}`)
        .set(tenantHeaders(tenant));

    expect((await remove()).status).toBe(200);
    expect(await Consumer.exists({ id: consumer.id })).toBeNull();
    expect((await remove()).status).toBe(404);
  });

  it("ne supprime pas le consumer d'une application d'un autre tenant", async () => {
    const alice = await registerTenant(app, "alice@test.com");
    const bob = await registerTenant(app, "bob@test.com");
    const bobClient = await createAppClient(app, bob);
    const consumer = await registerConsumer(app, bobClient);

    const res = await request(app)
      .delete(`/tenants/${alice.tenantId}/app/${bobClient.appId}/consumers/${consumer.id}`)
      .set(tenantHeaders(alice));

    expect(res.status).toBe(404);
    expect(await Consumer.exists({ id: consumer.id })).not.toBeNull();
  });
});

describe("Suppression du compte tenant", () => {
  it("supprime en cascade applications, consumers et sessions, sans toucher aux autres tenants", async () => {
    const tenant = await registerTenant(app);
    const client = await createAppClient(app, tenant);
    await registerConsumer(app, client);
    const other = await registerTenant(app, "other@test.com");
    const otherClient = await createAppClient(app, other);
    await registerConsumer(app, otherClient);

    const res = await request(app)
      .delete(`/tenants/${tenant.tenantId}`)
      .set(tenantHeaders(tenant))
      .send({ password: PASSWORD });

    expect(res.status).toBe(200);
    expect(await Tenant.exists({ id: tenant.tenantId })).toBeNull();
    expect(await AppClient.countDocuments({ tenantId: tenant.tenantId })).toBe(0);
    expect(await Consumer.countDocuments({ clientId: client.appId })).toBe(0);
    expect(await RefreshToken.countDocuments({ clientId: client.appId })).toBe(0);
    expect(await RefreshToken.countDocuments({ subjectId: tenant.tenantId })).toBe(0);
    expect(await Consumer.countDocuments({ clientId: otherClient.appId })).toBe(1);
  });

  it("refuse sans confirmation valide", async () => {
    const tenant = await registerTenant(app);

    const res = await request(app)
      .delete(`/tenants/${tenant.tenantId}`)
      .set(tenantHeaders(tenant))
      .send({ password: "Wrong1!pass" });

    expect(res.status).toBe(401);
    expect(await Tenant.exists({ id: tenant.tenantId })).not.toBeNull();
  });

  it("accepte l'e-mail recopié pour un compte Google sans mot de passe", async () => {
    const tenant = await registerTenant(app);
    await Tenant.updateOne({ id: tenant.tenantId }, { $unset: { password: 1 }, isByGoogle: true });

    const wrong = await request(app)
      .delete(`/tenants/${tenant.tenantId}`)
      .set(tenantHeaders(tenant))
      .send({ confirmEmail: "someone@else.com" });
    const res = await request(app)
      .delete(`/tenants/${tenant.tenantId}`)
      .set(tenantHeaders(tenant))
      .send({ confirmEmail: "TENANT@test.com" });

    expect(wrong.status).toBe(401);
    expect(res.status).toBe(200);
  });
});
