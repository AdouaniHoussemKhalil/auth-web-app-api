import request from "supertest";
import { createApp } from "../src/app";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import { createAppClient, registerTenant, tenantHeaders } from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

describe("Applications clientes", () => {
  it("exige un token tenant", async () => {
    const res = await request(app).post("/config/apps/create").send({});

    expect(res.status).toBe(401);
  });

  it("refuse un token invalide", async () => {
    const tenant = await registerTenant(app);

    const res = await request(app)
      .get(`/config/apps/${tenant.tenantId}`)
      .set({ ...tenantHeaders(tenant), Authorization: "Bearer invalid" });

    expect(res.status).toBe(403);
  });

  it("crée une application et expose ses identifiants", async () => {
    const tenant = await registerTenant(app);

    const client = await createAppClient(app, tenant);

    expect(client.appId).toEqual(expect.any(String));
    expect(client.secretKey).toEqual(expect.any(String));
  });

  it("liste les applications du tenant", async () => {
    const tenant = await registerTenant(app);
    const client = await createAppClient(app, tenant);

    const res = await request(app)
      .get(`/config/apps/${tenant.tenantId}`)
      .set(tenantHeaders(tenant));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({ id: client.appId })]);
  });

  it("désactive une application", async () => {
    const tenant = await registerTenant(app);
    const client = await createAppClient(app, tenant);

    const res = await request(app)
      .put(`/config/apps/update/${tenant.tenantId}/${client.appId}`)
      .set(tenantHeaders(tenant))
      .send({ isActive: false });

    expect(res.status).toBe(200);
  });
});

describe("Création d'application : validation et réglages MFA", () => {
  it("enregistre le mode et la durée MFA", async () => {
    const tenant = await registerTenant(app);

    const client = await createAppClient(app, tenant, {
      mfaVerificationMode: "link",
      mfaExpiresIn: "30m",
    });

    const res = await request(app)
      .get(`/config/apps/${tenant.tenantId}/${client.appId}`)
      .set(tenantHeaders(tenant));
    expect(res.body.mfaSettings).toEqual(
      expect.objectContaining({ verificationMode: "link", expiryMinutes: 30 })
    );
  });

  it("refuse une application sans URL de réinitialisation", async () => {
    const tenant = await registerTenant(app);

    const res = await request(app).post("/config/apps/create").set(tenantHeaders(tenant)).send({
      tenantId: tenant.tenantId,
      name: "Demo App",
      supportEmail: "support@demo.com",
      redirectUrl: "https://demo.com",
    });

    expect(res.status).toBe(400);
  });
});
