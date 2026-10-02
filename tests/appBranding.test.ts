import request from "supertest";
import { createApp } from "../src/app";
import { templates } from "../src/services/email/models/Template";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import {
  AppClientCredentials,
  createAppClient,
  registerTenant,
  sentEmails,
  tenantHeaders,
} from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();

let tenant: Awaited<ReturnType<typeof registerTenant>>;
let client: AppClientCredentials;

beforeAll(connectTestDB);
beforeEach(async () => {
  tenant = await registerTenant(app);
  client = await createAppClient(app, tenant, {
    name: "Lingutrack",
    logoUrl: "https://cdn.lingutrack.test/logo.png",
    primaryColor: "#2563EB",
  });
});
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const update = (body: Record<string, unknown>, by = tenant) =>
  request(app)
    .put(`/config/apps/update/${by.tenantId}/${client.appId}`)
    .set(tenantHeaders(by))
    .send(body);
const detail = async () =>
  (
    await request(app)
      .get(`/config/apps/${tenant.tenantId}/${client.appId}`)
      .set(tenantHeaders(tenant))
  ).body;

describe("Apparence des e-mails d'une application", () => {
  it("modifie le nom, le logo, la couleur et l'e-mail de support", async () => {
    const res = await update({
      name: "Lingutrack Pro",
      logoUrl: "https://cdn.lingutrack.test/logo-v2.png",
      primaryColor: "#16A34A",
      supportEmail: "aide@lingutrack.test",
    });

    expect(res.status).toBe(200);
    const app = await detail();
    expect(app.name).toBe("Lingutrack Pro");
    expect(app.branding).toMatchObject({
      appName: "Lingutrack Pro",
      logoUrl: "https://cdn.lingutrack.test/logo-v2.png",
      primaryColor: "#16A34A",
      supportEmail: "aide@lingutrack.test",
    });
  });

  it("retire le logo et la couleur avec null", async () => {
    expect((await update({ logoUrl: null, primaryColor: null })).status).toBe(200);

    const { branding } = await detail();
    expect(branding.logoUrl).toBeUndefined();
    expect(branding.primaryColor).toBeUndefined();
  });

  it("ne touche pas aux champs absents", async () => {
    await update({ supportEmail: "aide@lingutrack.test" });

    const app = await detail();
    expect(app.name).toBe("Lingutrack");
    expect(app.branding.logoUrl).toBe("https://cdn.lingutrack.test/logo.png");
    expect(app.isActive).toBe(true);
  });

  it("valide les valeurs", async () => {
    expect((await update({ primaryColor: "blue" })).status).toBe(400);
    expect((await update({ logoUrl: "not-a-url" })).status).toBe(400);
    expect((await update({ supportEmail: "nope" })).status).toBe(400);
    expect((await update({ name: "A" })).status).toBe(400);
  });

  it("ne permet pas de modifier l'application d'un autre tenant", async () => {
    const other = await registerTenant(app, "other@test.com");

    const res = await request(app)
      .put(`/config/apps/update/${other.tenantId}/${client.appId}`)
      .set(tenantHeaders(other))
      .send({ name: "Piratée" });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect((await detail()).name).toBe("Lingutrack");
  });
});

describe("E-mail de test", () => {
  const sendTest = (by = tenant) =>
    request(app)
      .post(`/config/apps/${by.tenantId}/${client.appId}/test-email`)
      .set(tenantHeaders(by));

  it("envoie au tenant un exemple aux couleurs de l'application", async () => {
    sentEmails().mockClear();

    const res = await sendTest();

    expect(res.status).toBe(200);
    expect(res.body.data.to).toBe(tenant.email);
    const [templateId, options] = sentEmails().mock.calls.at(-1)!;
    expect(templateId).toBe(templates.testEmail.id);
    expect(options.recipient.email).toBe(tenant.email);
    expect(options.branding).toMatchObject({
      appName: "Lingutrack",
      primaryColor: "#2563EB",
      logoUrl: "https://cdn.lingutrack.test/logo.png",
      supportEmail: "support@demo.com",
    });
  });

  it("refuse pour l'application d'un autre tenant", async () => {
    const other = await registerTenant(app, "other@test.com");
    sentEmails().mockClear();

    const res = await request(app)
      .post(`/config/apps/${other.tenantId}/${client.appId}/test-email`)
      .set(tenantHeaders(other));

    expect(res.status).toBe(404);
    expect(sentEmails()).not.toHaveBeenCalled();
  });
});
