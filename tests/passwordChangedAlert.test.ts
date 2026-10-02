import request from "supertest";
import { createApp } from "../src/app";
import { templates } from "../src/services/email/models/Template";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import {
  AppClientCredentials,
  PASSWORD,
  appHeaders,
  consumerHeaders,
  createAppClient,
  lastEmailVariable,
  registerConsumer,
  registerTenant,
  sentEmails,
} from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();
const NEW_PASSWORD = "NewPassword1!";

let client: AppClientCredentials;

beforeAll(connectTestDB);
beforeEach(async () => {
  client = await createAppClient(app, await registerTenant(app), { name: "Lingutrack" });
  sentEmails().mockClear();
});
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const alerts = () => sentEmails().mock.calls.filter(([id]) => id === templates.passwordChanged.id);

describe("Alerte « mot de passe modifié »", () => {
  it("est envoyée après une réinitialisation, aux couleurs de l'application", async () => {
    await registerConsumer(app, client);
    await request(app)
      .post("/consumers/auth/forgotPassword")
      .set(appHeaders(client))
      .send({ email: "user@test.com" });
    const { body } = await request(app)
      .post("/consumers/auth/verifyResetCode")
      .set(appHeaders(client))
      .send({ email: "user@test.com", resetCode: lastEmailVariable(templates.forgotPassword.id) });

    const res = await request(app)
      .put("/consumers/auth/resetPassword")
      .set(appHeaders(client))
      .send({
        email: "user@test.com",
        resetToken: body.resetToken,
        password: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      });

    expect(res.status).toBe(201);
    expect(alerts()).toHaveLength(1);
    const [, options] = alerts()[0];
    expect(options.recipient.email).toBe("user@test.com");
    expect(options.branding?.appName).toBe("Lingutrack");
  });

  it("est envoyée après une modification du mot de passe", async () => {
    const consumer = await registerConsumer(app, client);

    const res = await request(app)
      .put(`/consumers/auth/updatePassword/${consumer.id}`)
      .set(consumerHeaders(client, consumer))
      .send({
        userId: consumer.id,
        currentPassword: PASSWORD,
        password: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      });

    expect(res.status).toBe(201);
    expect(alerts()).toHaveLength(1);
  });

  it("est envoyée au tenant après la réinitialisation de son mot de passe, sans branding d'application", async () => {
    const tenant = await registerTenant(app, "alice@test.com");
    await request(app).post("/tenants/forgotPassword").send({ email: tenant.email });
    const { body } = await request(app)
      .post("/tenants/verifyResetCode")
      .send({ email: tenant.email, resetCode: lastEmailVariable(templates.forgotPassword.id) });

    await request(app).put("/tenants/resetPassword").send({
      email: tenant.email,
      resetToken: body.resetToken,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    const [, options] = alerts().at(-1)!;
    expect(options.recipient.email).toBe("alice@test.com");
    expect(options.branding).toBeUndefined();
  });

  it("n'empêche pas le changement de mot de passe si l'envoi échoue", async () => {
    const consumer = await registerConsumer(app, client);
    sentEmails().mockImplementationOnce(async () => {
      throw new Error("SMTP down");
    });

    const res = await request(app)
      .put(`/consumers/auth/updatePassword/${consumer.id}`)
      .set(consumerHeaders(client, consumer))
      .send({
        userId: consumer.id,
        currentPassword: PASSWORD,
        password: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      });

    expect(res.status).toBe(201);
    const login = await request(app)
      .post("/consumers/auth/login")
      .set(appHeaders(client))
      .send({ email: consumer.email, password: NEW_PASSWORD });
    expect(login.status).toBe(200);
  });
});
