import request from "supertest";
import { createApp } from "../src/app";
import { runMigrations } from "../src/config/migrations";
import AppClient from "../src/models/AppClient";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import { registerTenant, tenantHeaders } from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

describe("Mode MFA", () => {
  it("n'accepte que code ou link à la création d'une application", async () => {
    const tenant = await registerTenant(app);

    const res = await request(app).post("/config/apps/create").set(tenantHeaders(tenant)).send({
      tenantId: tenant.tenantId,
      name: "Demo App",
      supportEmail: "support@demo.com",
      redirectUrl: "https://demo.com",
      resetPasswordUrl: "https://demo.com/reset",
      mfaVerificationMode: "both",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validationError");
  });

  it("convertit en code une application enregistrée avec l'ancien mode both", async () => {
    await AppClient.collection.insertOne({
      id: "legacy-app",
      tenantId: "tenant",
      name: "Legacy",
      secretKey: "secret",
      apiKey: "key",
      redirectUrl: "https://legacy.com",
      resetPasswordUrl: "https://legacy.com/reset",
      mfaSettings: { verificationMode: "both", expiryMinutes: 15 },
    });

    await runMigrations();

    const app = await AppClient.findOne({ id: "legacy-app" });
    expect(app?.mfaSettings?.verificationMode).toBe("code");
  });
});
