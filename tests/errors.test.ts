import express from "express";
import request from "supertest";
import { createApp } from "../src/app";
import errorHandler from "../src/middleware/error/errorHandler";
import { createRateLimiter } from "../src/middleware/security/rateLimiter";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import {
  appHeaders,
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

// Toutes les erreurs de l'API partagent ce format.
const expectError = (res: request.Response, status: number, code: string) => {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({
    error: {
      status,
      code,
      message: expect.any(String),
      isSuccess: false,
      details: res.body.error?.details ?? null,
    },
  });
};

describe("Format d'erreur unique", () => {
  it("route inconnue", async () => {
    expectError(await request(app).get("/unknown"), 404, "routeNotFound");
  });

  it("corps JSON invalide", async () => {
    const res = await request(app)
      .post("/tenants/login")
      .set("Content-Type", "application/json")
      .send('{"email": ');

    expectError(res, 400, "invalidJson");
  });

  it("erreur de validation", async () => {
    const res = await request(app).post("/tenants/login").send({});

    expectError(res, 400, "validationError");
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })])
    );
  });

  it("identifiants d'application manquants ou invalides", async () => {
    const client = await createAppClient(app, await registerTenant(app));

    expectError(await request(app).post("/consumers/auth/login"), 400, "missingAppCredentials");
    expectError(
      await request(app)
        .post("/consumers/auth/login")
        .set({ ...appHeaders(client), "x-app-secret": "wrong" }),
      403,
      "invalidAppClient"
    );
  });

  it("token consumer manquant, invalide ou visant un autre compte", async () => {
    const client = await createAppClient(app, await registerTenant(app));
    const alice = await registerConsumer(app, client, "alice@test.com");
    const bob = await registerConsumer(app, client, "bob@test.com");
    const me = (id: string) => request(app).get(`/consumers/auth/me/${id}`).set(appHeaders(client));

    expectError(await me(alice.id), 401, "missingToken");
    expectError(await me(alice.id).set("Authorization", "Bearer invalid"), 403, "invalidToken");
    expectError(
      await me(bob.id).set("Authorization", `Bearer ${alice.accessToken}`),
      403,
      "forbiddenUser"
    );
  });

  it("accès tenant refusé", async () => {
    const alice = await registerTenant(app, "alice@test.com");
    const bob = await registerTenant(app, "bob@test.com");

    expectError(
      await request(app).get(`/config/apps/${alice.tenantId}`).set("Authorization", "Bearer x"),
      400,
      "missingTenantId"
    );
    expectError(
      await request(app).get(`/config/apps/${bob.tenantId}`).set(tenantHeaders(alice)),
      403,
      "forbiddenTenant"
    );
    expectError(
      await request(app)
        .get(`/tenants/${alice.tenantId}/app/unknown/consumers`)
        .set(tenantHeaders(alice)),
      404,
      "appNotFound"
    );
  });

  it("trop de requêtes", async () => {
    const limited = express();
    limited.use(createRateLimiter({ windowMs: 60_000, max: 1 }));
    limited.get("/", (_req, res) => {
      res.send("ok");
    });
    limited.use(errorHandler);

    await request(limited).get("/");
    expectError(await request(limited).get("/"), 429, "tooManyRequests");
  });

  it("code par défaut quand une erreur métier n'en précise pas", async () => {
    const failing = express();
    failing.get("/", () => {
      throw Object.assign(new Error("Something is missing"), { status: 404 });
    });
    failing.use(errorHandler);

    expectError(await request(failing).get("/"), 404, "notFound");
  });

  it("masque le détail des erreurs internes", async () => {
    const failing = express();
    failing.get("/", () => {
      throw new Error("E11000 duplicate key: secret internal detail");
    });
    failing.use(errorHandler);

    const res = await request(failing).get("/");

    expectError(res, 500, "internalError");
    expect(res.body.error.message).not.toContain("E11000");
  });
});
