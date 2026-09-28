import config from "config";
import request from "supertest";
import { createApp } from "../src/app";
import { Tenant } from "../src/models/Tenant";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./helpers/db";

jest.mock("../src/services/email/sendMails");
// Simule la vérification de l'ID token par Google. La fabrique s'exécute avant les imports :
// le client créé au chargement du handler utilise donc bien ce faux.
const mockVerifyIdToken = jest.fn();
jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    // Appel différé : le client est construit pendant l'import, avant l'initialisation du faux.
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  })),
}));
const verifyIdToken = mockVerifyIdToken;

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
const googleRegister = () =>
  request(app).post("/tenants/google-register").send({ token: "eyJ.google.token" });

beforeAll(connectTestDB);
afterEach(async () => {
  await clearTestDB();
  verifyIdToken.mockReset();
});
afterAll(disconnectTestDB);

describe("Connexion Google des tenants", () => {
  it("crée le tenant puis le reconnecte", async () => {
    verifyIdToken.mockResolvedValue(googlePayload());

    const first = await googleRegister();
    const second = await googleRegister();

    expect(first.status).toBe(200);
    expect(first.body.access_token).toEqual(expect.any(String));
    expect(second.body.user.tenantId).toBe(first.body.user.tenantId);
    expect(await Tenant.countDocuments({ email: "gina@gmail.com", isByGoogle: true })).toBe(1);
    expect(verifyIdToken).toHaveBeenCalledWith(
      expect.objectContaining({
        idToken: "eyJ.google.token",
        audience: config.get("google.clientId"),
      })
    );
  });

  it("répond 401 invalidGoogleToken pour un jeton refusé par Google", async () => {
    verifyIdToken.mockRejectedValue(
      new Error("Wrong recipient, payload audience != requiredAudience")
    );

    const res = await googleRegister();

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("invalidGoogleToken");
  });

  it("refuse un compte Google dont l'e-mail n'est pas vérifié", async () => {
    verifyIdToken.mockResolvedValue(googlePayload({ email_verified: false }));

    const res = await googleRegister();

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("googleEmailNotVerified");
  });

  it("accepte un compte Google sans nom de famille", async () => {
    verifyIdToken.mockResolvedValue(googlePayload({ family_name: undefined }));

    expect((await googleRegister()).status).toBe(200);
  });

  it("refuse un tenant désactivé", async () => {
    verifyIdToken.mockResolvedValue(googlePayload());
    await googleRegister();
    await Tenant.updateOne({ email: "gina@gmail.com" }, { isActive: false });

    const res = await googleRegister();

    expect(res.status).toBe(403);
  });
});
