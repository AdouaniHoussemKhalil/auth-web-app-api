import request from "supertest";
import { createApp } from "../src/app";
import { Consumer } from "../src/models/Consumer";
import { templates } from "../src/services/email/models/Template";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";
import {
  AppClientCredentials,
  appHeaders,
  consumerHeaders,
  createAppClient,
  lastEmailVariable,
  registerConsumer,
  registerTenant,
  tenantHeaders,
} from "./helpers/fixtures";

jest.mock("../src/services/email/sendMails");
// Simule la vérification de l'ID token par Google (voir google.test.ts).
const mockVerifyIdToken = jest.fn();
jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  })),
}));

const GOOGLE_CLIENT_ID = "1234-app.apps.googleusercontent.com";

const googlePayload = (overrides: Record<string, unknown> = {}) => ({
  getPayload: () => ({
    email: "gina@gmail.com",
    email_verified: true,
    given_name: "Gina",
    family_name: "Google",
    ...overrides,
  }),
});

const app = createApp();

let tenant: Awaited<ReturnType<typeof registerTenant>>;
let client: AppClientCredentials;

const googleLogin = (credentials: AppClientCredentials = client) =>
  request(app)
    .post("/consumers/auth/google")
    .set(appHeaders(credentials))
    .send({ token: "eyJ.google.token" });

beforeAll(connectTestDB);
beforeEach(async () => {
  tenant = await registerTenant(app);
  client = await createAppClient(app, tenant, { googleClientId: GOOGLE_CLIENT_ID });
  mockVerifyIdToken.mockResolvedValue(googlePayload());
});
afterEach(async () => {
  await clearTestDB();
  mockVerifyIdToken.mockReset();
});
afterAll(disconnectTestDB);

describe("Connexion Google des consumers", () => {
  it("crée le consumer au premier passage puis le reconnecte", async () => {
    const first = await googleLogin();
    const second = await googleLogin();

    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ isNewUser: true, isSuccess: true });
    expect(first.body.access_token).toEqual(expect.any(String));
    expect(first.body.user).toMatchObject({ email: "gina@gmail.com", firstName: "Gina" });
    expect(second.status).toBe(200);
    expect(second.body.isNewUser).toBe(false);
    expect(second.body.user.id).toBe(first.body.user.id);

    const consumer = await Consumer.findOne({ email: "gina@gmail.com" });
    expect(consumer).toMatchObject({
      clientId: client.appId,
      isByGoogle: true,
      isEmailVerified: true,
    });
    expect(consumer?.password).toBeUndefined();
    expect(mockVerifyIdToken).toHaveBeenCalledWith(
      expect.objectContaining({ idToken: "eyJ.google.token", audience: GOOGLE_CLIENT_ID })
    );
  });

  it("donne une session utilisable sur les routes protégées", async () => {
    const { body } = await googleLogin();

    const me = await request(app)
      .get(`/consumers/auth/me/${body.user.id}`)
      .set(consumerHeaders(client, { accessToken: body.access_token }));

    expect(me.status).toBe(200);
  });

  it("cloisonne les comptes par application", async () => {
    const otherApp = await createAppClient(app, tenant, {
      name: "Other App",
      googleClientId: GOOGLE_CLIENT_ID,
    });

    const first = await googleLogin();
    const other = await googleLogin(otherApp);

    expect(other.status).toBe(201);
    expect(other.body.user.id).not.toBe(first.body.user.id);
  });

  it("relie le compte existant de même e-mail et confirme son adresse", async () => {
    const existing = await registerConsumer(app, client, "gina@gmail.com");

    const res = await googleLogin();

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(existing.id);
    expect((await Consumer.findOne({ id: existing.id }))?.isEmailVerified).toBe(true);
  });

  it("refuse si l'application n'a pas de Client ID Google", async () => {
    const withoutGoogle = await createAppClient(app, tenant, { name: "No Google" });

    const res = await googleLogin(withoutGoogle);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("googleSignInDisabled");
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("refuse un jeton invalide ou un e-mail Google non vérifié", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("Wrong recipient"));
    const invalid = await googleLogin();
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe("invalidGoogleToken");

    mockVerifyIdToken.mockResolvedValueOnce(googlePayload({ email_verified: false }));
    const unverified = await googleLogin();
    expect(unverified.status).toBe(401);
    expect(unverified.body.error.code).toBe("googleEmailNotVerified");
  });

  it("refuse un consumer bloqué", async () => {
    const { body } = await googleLogin();
    await request(app)
      .patch(`/tenants/${tenant.tenantId}/app/${client.appId}/consumers/${body.user.id}`)
      .set(tenantHeaders(tenant))
      .send({ isActive: false });

    const res = await googleLogin();

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("UserBlocked");
  });

  it("exige le code MFA si l'utilisateur l'a activé", async () => {
    const { body } = await googleLogin();
    await Consumer.updateOne({ id: body.user.id }, { isMFAActivated: true });

    const res = await googleLogin();
    expect(res.status).toBe(200);
    expect(res.body.MFARequired).toBe(true);
    expect(res.body.access_token).toBeUndefined();

    const mfa = await request(app)
      .post("/consumers/auth/loginByMFA")
      .set(appHeaders(client))
      .send({ email: "gina@gmail.com", mfaCode: lastEmailVariable(templates.loginByCodeMFA.id) });
    expect(mfa.status).toBe(200);
    expect(mfa.body.access_token).toEqual(expect.any(String));
  });

  it("oriente vers Google la connexion par mot de passe d'un compte Google", async () => {
    await googleLogin();

    const res = await request(app)
      .post("/consumers/auth/login")
      .set(appHeaders(client))
      .send({ email: "gina@gmail.com", password: "Password1!" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("useGoogleSignIn");
  });

  it("supprime un compte Google sans mot de passe avec l'e-mail recopié", async () => {
    const { body } = await googleLogin();
    const headers = consumerHeaders(client, { accessToken: body.access_token });

    const refused = await request(app)
      .delete(`/consumers/auth/me/${body.user.id}`)
      .set(headers)
      .send({ confirmEmail: "other@gmail.com" });
    expect(refused.status).toBe(401);

    const res = await request(app)
      .delete(`/consumers/auth/me/${body.user.id}`)
      .set(headers)
      .send({ confirmEmail: "Gina@gmail.com" });
    expect(res.status).toBe(200);
    expect(await Consumer.exists({ id: body.user.id })).toBeNull();
  });
});

describe("Client ID Google d'une application", () => {
  const detail = () =>
    request(app).get(`/config/apps/${tenant.tenantId}/${client.appId}`).set(tenantHeaders(tenant));
  const update = (body: Record<string, unknown>) =>
    request(app)
      .put(`/config/apps/update/${tenant.tenantId}/${client.appId}`)
      .set(tenantHeaders(tenant))
      .send(body);

  it("se définit à la création, se modifie et se retire", async () => {
    expect((await detail()).body.googleClientId).toBe(GOOGLE_CLIENT_ID);

    expect((await update({ googleClientId: "5678-new.apps.googleusercontent.com" })).status).toBe(
      200
    );
    expect((await detail()).body.googleClientId).toBe("5678-new.apps.googleusercontent.com");

    expect((await update({ googleClientId: null })).status).toBe(200);
    expect((await detail()).body.googleClientId).toBeUndefined();
    expect((await googleLogin()).body.error.code).toBe("googleSignInDisabled");
  });

  it("refuse une valeur qui n'est pas un Client ID Google", async () => {
    const res = await update({ googleClientId: "not-a-client-id" });

    expect(res.status).toBe(400);
  });
});
