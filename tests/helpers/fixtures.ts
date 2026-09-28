import request from "supertest";
import { Express } from "express";
import sendTemplateEmail from "../../src/services/email/sendMails";

export const PASSWORD = "Password1!";

export const sentEmails = () => sendTemplateEmail as jest.MockedFunction<typeof sendTemplateEmail>;

// Dernière valeur (code ou lien) envoyée par e-mail pour un template donné.
export const lastEmailVariable = (templateId: string): string => {
  const call = [...sentEmails().mock.calls].reverse().find(([id]) => id === templateId);
  if (!call) throw new Error(`No email sent with template ${templateId}`);
  return call[1].variable as string;
};

export const registerTenant = async (app: Express, email = "tenant@test.com") => {
  const res = await request(app).post("/tenants/register").send({
    firstName: "Alice",
    lastName: "Tenant",
    email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
    role: "tenant",
  });
  expect(res.status).toBe(201);
  return {
    tenantId: res.body.tenantId as string,
    accessToken: res.body.access_token as string,
    email,
  };
};

export const tenantHeaders = (tenant: { tenantId: string; accessToken: string }) => ({
  Authorization: `Bearer ${tenant.accessToken}`,
  "X-Tenant-Id": tenant.tenantId,
});

export const createAppClient = async (
  app: Express,
  tenant: { tenantId: string; accessToken: string }
) => {
  const created = await request(app).post("/config/apps/create").set(tenantHeaders(tenant)).send({
    tenantId: tenant.tenantId,
    name: "Demo App",
    supportEmail: "support@demo.com",
    redirectUrl: "https://demo.com",
    resetPasswordUrl: "https://demo.com/reset",
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
