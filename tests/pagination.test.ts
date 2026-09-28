import request from "supertest";
import { createApp } from "../src/app";
import { Consumer } from "../src/models/Consumer";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import { createAppClient, registerTenant, tenantHeaders } from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

// Insertion directe : plus rapide que 25 inscriptions (hachage bcrypt).
const seedConsumers = (clientId: string, count: number) =>
  Consumer.insertMany(
    Array.from({ length: count }, (_, i) => ({
      id: `consumer-${i}`,
      clientId,
      firstName: "User",
      lastName: `Number${i}`,
      email: `user${i}@test.com`,
      password: "hashed",
      createdOn: new Date(Date.UTC(2026, 0, 1, 0, i)),
    }))
  );

describe("Pagination des consumers", () => {
  it("pagine, trie du plus récent au plus ancien et renvoie le total", async () => {
    const tenant = await registerTenant(app);
    const client = await createAppClient(app, tenant);
    await seedConsumers(client.appId, 25);
    const page = (query: string) =>
      request(app)
        .get(`/tenants/${tenant.tenantId}/app/${client.appId}/consumers?${query}`)
        .set(tenantHeaders(tenant));

    const first = await page("limit=10");
    const last = await page("page=3&limit=10");

    expect(first.body).toMatchObject({ page: 1, limit: 10, total: 25, isSuccess: true });
    expect(first.body.data).toHaveLength(10);
    expect(first.body.data[0].email).toBe("user24@test.com");
    expect(last.body.data).toHaveLength(5);
    expect(first.body.data[0]).not.toHaveProperty("password");
  });

  it("recherche par e-mail sans interpréter les caractères spéciaux", async () => {
    const tenant = await registerTenant(app);
    const client = await createAppClient(app, tenant);
    await seedConsumers(client.appId, 12);
    const search = (email: string) =>
      request(app)
        .get(`/tenants/${tenant.tenantId}/app/${client.appId}/consumers`)
        .query({ email })
        .set(tenantHeaders(tenant));

    const res = await search("USER1");

    expect(res.body.total).toBe(3); // user1, user10, user11
    expect((await search(".*")).body.total).toBe(0);
  });

  it("refuse une taille de page hors limites", async () => {
    const tenant = await registerTenant(app);
    const client = await createAppClient(app, tenant);

    const res = await request(app)
      .get(`/tenants/${tenant.tenantId}/app/${client.appId}/consumers?limit=500`)
      .set(tenantHeaders(tenant));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validationError");
  });
});

describe("Pagination des applications", () => {
  it("pagine les applications du tenant", async () => {
    const tenant = await registerTenant(app);
    for (let i = 0; i < 3; i++) await createAppClient(app, tenant, { name: `App ${i}` });

    const res = await request(app)
      .get(`/config/apps/${tenant.tenantId}?limit=2`)
      .set(tenantHeaders(tenant));

    expect(res.body).toMatchObject({ page: 1, limit: 2, total: 3 });
    expect(res.body.data).toHaveLength(2);
  });
});
