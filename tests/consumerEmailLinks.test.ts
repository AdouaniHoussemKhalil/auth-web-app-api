import request from "supertest";
import { createApp } from "../src/app";
import AppClient from "../src/models/AppClient";
import { Consumer } from "../src/models/Consumer";
import { templates } from "../src/services/email/models/Template";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import {
  AppClientCredentials,
  PASSWORD,
  appHeaders,
  createAppClient,
  emailsSent,
  lastEmailVariable,
  registerConsumer,
  registerTenant,
  tenantHeaders,
} from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");

const app = createApp();

const VERIFIED_URL = "https://lingutrack.test/email-verified";
const FAILED_URL = "https://lingutrack.test/email-error?from=email";
const RESET_URL = "https://lingutrack.test/reset-password";

let tenant: Awaited<ReturnType<typeof registerTenant>>;
let client: AppClientCredentials;

beforeAll(connectTestDB);
beforeEach(async () => {
  tenant = await registerTenant(app);
  client = await createAppClient(app, tenant, {
    resetPasswordUrl: RESET_URL,
    requireEmailVerification: true,
    emailVerificationMode: "link",
    passwordResetMode: "link",
    emailVerifiedUrl: VERIFIED_URL,
    emailVerificationFailedUrl: FAILED_URL,
  });
});
afterEach(clearTestDB);
afterAll(disconnectTestDB);

/** Inscrit un consumer et renvoie le lien de vérification reçu, en chemin relatif à l'API. */
const registerAndGetLink = async (email = "bob@test.com") => {
  const res = await request(app).post("/consumers/auth/register").set(appHeaders(client)).send({
    firstName: "Bob",
    lastName: "Durand",
    email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
  });
  expect(res.status).toBe(201);
  const link = new URL(lastEmailVariable(templates.emailVerificationLink.id, email));
  return { userId: res.body.user.id as string, path: `${link.pathname}${link.search}`, link };
};

const login = (email: string, password = PASSWORD) =>
  request(app).post("/consumers/auth/login").set(appHeaders(client)).send({ email, password });

describe("Configuration des liens", () => {
  it("exige les URLs de succès et d'échec en mode lien", async () => {
    const res = await request(app).post("/config/apps/create").set(tenantHeaders(tenant)).send({
      tenantId: tenant.tenantId,
      name: "Sans URLs",
      supportEmail: "s@test.com",
      redirectUrl: "https://x.test",
      resetPasswordUrl: "https://x.test/reset",
      emailVerificationMode: "link",
    });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.error.details)).toContain("emailVerifiedUrl");
  });

  it("indique le mode dans les réponses, sans révéler l'existence d'un compte", async () => {
    const registered = await request(app)
      .post("/consumers/auth/register")
      .set(appHeaders(client))
      .send({
        firstName: "Bob",
        lastName: "Durand",
        email: "mode@test.com",
        password: PASSWORD,
        confirmPassword: PASSWORD,
      });
    expect(registered.body.emailVerificationMode).toBe("link");

    for (const email of ["mode@test.com", "inconnu@test.com"]) {
      const resend = await request(app)
        .post("/consumers/auth/resendEmailVerification")
        .set(appHeaders(client))
        .send({ email });
      expect(resend.body.emailVerificationMode).toBe("link");
    }
  });

  it("garde le mode code par défaut", async () => {
    const plain = await createAppClient(app, tenant, { name: "Code" });
    const app2 = await AppClient.findOne({ id: plain.appId });

    expect(app2).toMatchObject({ emailVerificationMode: "code", passwordResetMode: "code" });
    await registerConsumer(app, plain, "code@test.com");
    expect(emailsSent(templates.emailVerification.id)).toBeGreaterThan(0);
    const forgot = await request(app)
      .post("/consumers/auth/forgotPassword")
      .set(appHeaders(plain))
      .send({ email: "code@test.com" });
    expect(forgot.body.passwordResetMode).toBe("code");
  });
});

describe("Vérification d'e-mail par lien", () => {
  it("envoie un lien vers l'API qui vérifie l'adresse puis redirige vers l'URL de succès", async () => {
    const { userId, path, link } = await registerAndGetLink();

    expect(link.searchParams.get("u")).toBe(userId);
    expect(link.searchParams.get("t")).toMatch(/^[0-9a-f]{64}$/);
    expect((await login("bob@test.com")).body.error.code).toBe("emailNotVerified");

    const res = await request(app).get(path);

    expect(res.status).toBe(303);
    expect(res.headers.location).toBe(VERIFIED_URL);
    expect((await Consumer.findOne({ id: userId }))?.isEmailVerified).toBe(true);
    expect((await login("bob@test.com")).status).toBe(200);
  });

  it("mène au succès si le lien est rouvert (antivirus de messagerie)", async () => {
    const { path } = await registerAndGetLink();
    await request(app).get(path);

    const again = await request(app).get(path);

    expect(again.status).toBe(303);
    expect(again.headers.location).toBe(VERIFIED_URL);
  });

  it("redirige vers l'URL d'échec avec reason=invalid pour un jeton faux, en gardant ses paramètres", async () => {
    const { userId } = await registerAndGetLink();

    const res = await request(app).get(`/consumers/auth/verify-email-link?u=${userId}&t=faux`);

    expect(res.status).toBe(303);
    const location = new URL(res.headers.location);
    expect(`${location.origin}${location.pathname}`).toBe("https://lingutrack.test/email-error");
    expect(location.searchParams.get("from")).toBe("email");
    expect(location.searchParams.get("reason")).toBe("invalid");
    expect((await Consumer.findOne({ id: userId }))?.isEmailVerified).toBe(false);
  });

  it("redirige avec reason=expired pour un lien expiré", async () => {
    const { userId, path } = await registerAndGetLink();
    await Consumer.updateOne(
      { id: userId },
      { $set: { "oneTimeCodes.emailVerification.expires": new Date(Date.now() - 1000) } }
    );

    const res = await request(app).get(path);

    expect(new URL(res.headers.location).searchParams.get("reason")).toBe("expired");
  });

  it("refuse le lien d'un utilisateur bloqué", async () => {
    const { userId, path } = await registerAndGetLink();
    await Consumer.updateOne({ id: userId }, { isActive: false });

    const res = await request(app).get(path);

    expect(new URL(res.headers.location).searchParams.get("reason")).toBe("invalid");
  });

  it("affiche une page simple pour un lien inconnu ou sans URL configurée", async () => {
    const unknown = await request(app).get("/consumers/auth/verify-email-link?u=inconnu&t=x");
    expect(unknown.status).toBe(400);
    expect(unknown.text).toContain("Lien invalide");

    const { path } = await registerAndGetLink();
    await AppClient.updateOne(
      { id: client.appId },
      { $unset: { emailVerifiedUrl: 1, emailVerificationFailedUrl: 1 } }
    );
    const ok = await request(app).get(path);
    expect(ok.status).toBe(200);
    expect(ok.headers["content-type"]).toContain("text/html");
    expect(ok.text).toContain("Adresse e-mail confirmée");
  });

  it("envoie un nouveau lien au renvoi", async () => {
    const { path: first } = await registerAndGetLink();

    await request(app)
      .post("/consumers/auth/resendEmailVerification")
      .set(appHeaders(client))
      .send({ email: "bob@test.com" });
    const second = new URL(lastEmailVariable(templates.emailVerificationLink.id));

    // Seul le dernier lien est valable.
    expect(
      new URL((await request(app).get(first)).headers.location).searchParams.get("reason")
    ).toBe("invalid");
    expect((await request(app).get(`${second.pathname}${second.search}`)).headers.location).toBe(
      VERIFIED_URL
    );
  });
});

describe("Réinitialisation du mot de passe par lien", () => {
  const forgot = (email: string) =>
    request(app).post("/consumers/auth/forgotPassword").set(appHeaders(client)).send({ email });

  it("envoie un lien vers la page de l'application, utilisable sur /resetPassword", async () => {
    const { userId } = await registerAndGetLink();
    expect((await forgot("bob@test.com")).status).toBe(201);

    const link = new URL(lastEmailVariable(templates.forgotPasswordLink.id));
    expect(`${link.origin}${link.pathname}`).toBe(RESET_URL);
    expect(link.searchParams.get("email")).toBe("bob@test.com");

    const newPassword = "NewPassword1!";
    const reset = await request(app)
      .put("/consumers/auth/resetPassword")
      .set(appHeaders(client))
      .send({
        email: link.searchParams.get("email"),
        resetToken: link.searchParams.get("token"),
        password: newPassword,
        confirmPassword: newPassword,
      });

    expect(reset.status).toBe(201);
    expect((await login("bob@test.com", newPassword)).status).toBe(200);
    // Le lien reçu par e-mail prouve aussi le contrôle de l'adresse.
    expect((await Consumer.findOne({ id: userId }))?.isEmailVerified).toBe(true);

    const reuse = await request(app)
      .put("/consumers/auth/resetPassword")
      .set(appHeaders(client))
      .send({
        email: "bob@test.com",
        resetToken: link.searchParams.get("token"),
        password: "Another1!pass",
        confirmPassword: "Another1!pass",
      });
    expect(reuse.status).toBe(400);
  });

  it("n'envoie rien pour un e-mail inconnu, avec la même réponse", async () => {
    const before = emailsSent(templates.forgotPasswordLink.id);

    const res = await forgot("inconnu@test.com");

    expect(res.status).toBe(201);
    expect(res.body.passwordResetMode).toBe("link");
    expect(emailsSent(templates.forgotPasswordLink.id)).toBe(before);
  });
});
