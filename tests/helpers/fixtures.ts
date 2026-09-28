import request from "supertest";
import { Express } from "express";
import sendTemplateEmail from "../../src/services/email/sendMails";

export const PASSWORD = "Password1!";

export const sentEmails = () => sendTemplateEmail as jest.MockedFunction<typeof sendTemplateEmail>;

// Dernière valeur (code ou lien) envoyée par e-mail pour un template donné, éventuellement à un destinataire donné.
export const lastEmailVariable = (templateId: string, to?: string): string => {
  const call = [...sentEmails().mock.calls]
    .reverse()
    .find(([id, { recipient }]) => id === templateId && (!to || recipient.email === to));
  if (!call) throw new Error(`No email sent with template ${templateId}${to ? ` to ${to}` : ""}`);
  return call[1].variable as string;
};

// Nombre d'e-mails envoyés avec un template donné.
export const emailsSent = (templateId: string) =>
  sentEmails().mock.calls.filter(([id]) => id === templateId).length;

export const registerTenant = async (app: Express, email = "tenant@test.com") => {
  const res = await request(app).post("/tenants/register").send({
    firstName: "Alice",
    lastName: "Tenant",
    email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
  });
  expect(res.status).toBe(201);

  // L'inscription n'ouvre pas de session : la vérification de l'e-mail renvoie les tokens.
  const verified = await request(app)
    .post("/tenants/verifyEmail")
    .send({ email, code: lastEmailVariable("emailVerification", email) });
  expect(verified.status).toBe(200);

  return {
    tenantId: res.body.tenantId as string,
    accessToken: verified.body.access_token as string,
    refreshToken: verified.body.refresh_token as string,
    email,
  };
};

export const tenantHeaders = (tenant: { tenantId: string; accessToken: string }) => ({
  Authorization: `Bearer ${tenant.accessToken}`,
  "X-Tenant-Id": tenant.tenantId,
});

export const createAppClient = async (
  app: Express,
  tenant: { tenantId: string; accessToken: string },
  overrides: Record<string, unknown> = {}
) => {
  const created = await request(app)
    .post("/config/apps/create")
    .set(tenantHeaders(tenant))
    .send({
      tenantId: tenant.tenantId,
      name: "Demo App",
      supportEmail: "support@demo.com",
      redirectUrl: "https://demo.com",
      resetPasswordUrl: "https://demo.com/reset",
      ...overrides,
    });
  expect(created.status).toBe(201);

  const appId = created.body.data.appId as string;
  const detail = await request(app)
    .get(`/config/apps/${tenant.tenantId}/${appId}`)
    .set(tenantHeaders(tenant));
  expect(detail.status).toBe(200);

  return { appId, secretKey: detail.body.secretKey as string };
};

export const appHeaders = (client: { appId: string; secretKey: string }) => ({
  "x-app-id": client.appId,
  "x-app-secret": client.secretKey,
});

export type AppClientCredentials = { appId: string; secretKey: string };

export const registerConsumer = async (
  app: Express,
  client: AppClientCredentials,
  email = "user@test.com"
) => {
  const res = await request(app).post("/consumers/auth/register").set(appHeaders(client)).send({
    firstName: "Bob",
    lastName: "Consumer",
    email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
  });
  expect(res.status).toBe(201);
  return {
    id: res.body.user.id as string,
    email,
    accessToken: res.body.access_token as string,
  };
};

export const consumerHeaders = (
  client: AppClientCredentials,
  consumer: { accessToken: string }
) => ({
  ...appHeaders(client),
  Authorization: `Bearer ${consumer.accessToken}`,
});
