import request from "supertest";
import { createApp } from "../src/app";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import {
  AppClientCredentials,
  createAppClient,
  registerTenant,
  tenantHeaders,
} from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();

let tenant: Awaited<ReturnType<typeof registerTenant>>;
let client: AppClientCredentials;

beforeAll(connectTestDB);
beforeEach(async () => {
  tenant = await registerTenant(app);
  client = await createAppClient(app, tenant, { logoutUrl: "https://demo.com/logout" });
});
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const update = (body: Record<string, unknown>) =>
  request(app)
    .put(`/config/apps/update/${tenant.tenantId}/${client.appId}`)
    .set(tenantHeaders(tenant))
    .send(body);
const detail = async () =>
  (
    await request(app)
      .get(`/config/apps/${tenant.tenantId}/${client.appId}`)
      .set(tenantHeaders(tenant))
  ).body;

describe("URLs et réglages de vérification d'une application", () => {
  it("modifie les URLs et passe en mode lien", async () => {
    const res = await update({
      redirectUrl: "https://lingutrack.test",
      resetPasswordUrl: "https://lingutrack.test/reset-password",
      emailVerifiedUrl: "https://lingutrack.test/email-verified",
      emailVerificationFailedUrl: "https://lingutrack.test/email-error",
      emailVerificationMode: "link",
      passwordResetMode: "link",
      mfaVerificationMode: "link",
      requireEmailVerification: true,
    });

    expect(res.status).toBe(200);
    expect(await detail()).toMatchObject({
      redirectUrl: "https://lingutrack.test",
      resetPasswordUrl: "https://lingutrack.test/reset-password",
      emailVerifiedUrl: "https://lingutrack.test/email-verified",
      emailVerificationFailedUrl: "https://lingutrack.test/email-error",
      emailVerificationMode: "link",
      passwordResetMode: "link",
      mfaSettings: { verificationMode: "link" },
      requireEmailVerification: true,
    });
  });

  it("retire une URL optionnelle avec null et laisse les autres champs", async () => {
    expect((await update({ logoutUrl: null })).status).toBe(200);

    const settings = await detail();
    expect(settings.logoutUrl).toBeUndefined();
    expect(settings.redirectUrl).toBe("https://demo.com");
    expect(settings.emailVerificationMode).toBe("code");
  });

  it("refuse le mode lien sans URLs de succès et d'échec", async () => {
    const res = await update({ emailVerificationMode: "link" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("verificationUrlsRequired");
    expect((await detail()).emailVerificationMode).toBe("code");
  });

  it("refuse de retirer une URL tant que le mode lien est actif", async () => {
    await update({
      emailVerifiedUrl: "https://x.test/ok",
      emailVerificationFailedUrl: "https://x.test/ko",
      emailVerificationMode: "link",
    });

    const res = await update({ emailVerificationFailedUrl: null });

    expect(res.status).toBe(400);
    expect((await detail()).emailVerificationFailedUrl).toBe("https://x.test/ko");
  });

  it("valide les valeurs", async () => {
    expect((await update({ redirectUrl: "pas-une-url" })).status).toBe(400);
    expect((await update({ passwordResetMode: "sms" })).status).toBe(400);
    expect((await update({ requireEmailVerification: "oui" })).status).toBe(400);
  });
});
