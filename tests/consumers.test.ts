import request from "supertest";
import { createApp } from "../src/app";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import { appHeaders, createAppClient, registerTenant } from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

describe("Authentification de l'application cliente", () => {
  it("exige les en-têtes x-app-id et x-app-secret", async () => {
    const res = await request(app).post("/consumers/auth/login").send({});

    expect(res.status).toBe(400);
  });

  it("refuse un secret invalide", async () => {
    const tenant = await registerTenant(app);
    const client = await createAppClient(app, tenant);

    const res = await request(app)
      .post("/consumers/auth/login")
      .set({ ...appHeaders(client), "x-app-secret": "wrong" })
      .send({ email: "user@test.com", password: "x" });

    expect(res.status).toBe(403);
  });

  it("refuse une application désactivée", async () => {
    const tenant = await registerTenant(app);
    const client = await createAppClient(app, tenant);
    await request(app)
      .put(`/config/apps/update/${tenant.tenantId}/${client.appId}`)
      .set({ Authorization: `Bearer ${tenant.accessToken}`, "X-Tenant-Id": tenant.tenantId })
      .send({ isActive: false });

    const res = await request(app)
      .post("/consumers/auth/login")
      .set(appHeaders(client))
      .send({ email: "user@test.com", password: "x" });

    expect(res.status).toBe(403);
  });
});
