import request from "supertest";
import { createApp } from "../src/app";
import { Tenant } from "../src/models/Tenant";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import { registerTenant, sentEmails, tenantHeaders } from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();

beforeAll(connectTestDB);
afterEach(async () => {
  await clearTestDB();
  sentEmails().mockClear();
});
afterAll(disconnectTestDB);

describe("Modification du profil tenant", () => {
  it("met à jour le prénom et le nom et renvoie le profil", async () => {
    const tenant = await registerTenant(app);

    const res = await request(app)
      .put(`/tenants/${tenant.tenantId}`)
      .set(tenantHeaders(tenant))
      .send({ firstName: "  Alicia ", lastName: "Durand" });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      tenantId: tenant.tenantId,
      firstName: "Alicia",
      lastName: "Durand",
      email: tenant.email,
    });
    expect(await Tenant.findOne({ id: tenant.tenantId })).toMatchObject({
      firstName: "Alicia",
      lastName: "Durand",
    });
  });

  it("valide les champs et refuse ceux qui ne sont pas modifiables", async () => {
    const tenant = await registerTenant(app);
    const update = (body: object) =>
      request(app).put(`/tenants/${tenant.tenantId}`).set(tenantHeaders(tenant)).send(body);

    expect((await update({ firstName: "Al", lastName: "Durand" })).status).toBe(400);
    const withEmail = await update({ firstName: "Alicia", lastName: "Durand", email: "x@y.z" });
    expect(withEmail.status).toBe(400);
    expect((await Tenant.findOne({ id: tenant.tenantId }))?.email).toBe(tenant.email);
  });

  it("interdit de modifier le profil d'un autre tenant", async () => {
    const alice = await registerTenant(app, "alice@test.com");
    const bob = await registerTenant(app, "bob@test.com");

    const res = await request(app)
      .put(`/tenants/${bob.tenantId}`)
      .set(tenantHeaders(alice))
      .send({ firstName: "Hacked", lastName: "Hacked" });

    expect(res.status).toBe(403);
    expect((await Tenant.findOne({ id: bob.tenantId }))?.firstName).toBe("Alice");
  });

  it("exige d'être connecté", async () => {
    const tenant = await registerTenant(app);

    const res = await request(app)
      .put(`/tenants/${tenant.tenantId}`)
      .send({ firstName: "Alicia", lastName: "Durand" });

    expect(res.status).toBe(401);
  });
});
