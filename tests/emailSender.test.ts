import nodemailer from "nodemailer";
import { createEmailSender, resolveEmailProvider } from "../src/services/email/emailSender";
import { consoleProvider } from "../src/services/email/providers";
import { logger } from "../src/utils/logger";

jest.mock("nodemailer");

const sendMail = jest.fn();
(nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

const smtp = {
  host: "smtp.test.com",
  port: 465,
  secure: true,
  auth: { user: "sender@test.com", pass: "secret" },
};

const message = {
  from: '"App" <sender@test.com>',
  to: "user@test.com",
  subject: "Code",
  html: "<p>123456</p>",
  variable: "123456",
};

let loggedInfo: jest.SpyInstance;

beforeEach(() => {
  sendMail.mockReset();
  loggedInfo = jest.spyOn(logger, "info");
});

afterEach(() => jest.restoreAllMocks());

describe("Choix du provider d'e-mails", () => {
  it("utilise SMTP par défaut quand les identifiants sont renseignés", () => {
    expect(resolveEmailProvider({ smtp, isProduction: false }).name).toBe("smtp");
  });

  it("bascule sur la console sans identifiants SMTP", () => {
    const provider = resolveEmailProvider({
      smtp: { ...smtp, auth: { user: "sender@test.com", pass: "" } },
      isProduction: false,
    });

    expect(provider).toBe(consoleProvider);
  });

  it("utilise la console quand elle est demandée", () => {
    expect(resolveEmailProvider({ provider: "console", smtp, isProduction: false })).toBe(
      consoleProvider
    );
  });

  it("refuse un provider inconnu", () => {
    expect(() => resolveEmailProvider({ provider: "carrier-pigeon", isProduction: false })).toThrow(
      /Unknown email provider/
    );
  });
});

describe("Envoi", () => {
  it("affiche le code dans le terminal avec le provider console", async () => {
    await createEmailSender({ provider: "console", isProduction: false })(message);

    expect(loggedInfo).toHaveBeenCalledWith(
      expect.objectContaining({ code: "123456" }),
      expect.any(String)
    );
  });

  it("envoie par SMTP sans le code en clair hors du HTML", async () => {
    sendMail.mockResolvedValue({ messageId: "1" });

    await createEmailSender({ smtp, isProduction: false })(message);

    expect(sendMail).toHaveBeenCalledWith({
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
  });

  it("hors production, affiche l'e-mail en console si SMTP échoue", async () => {
    sendMail.mockRejectedValue(new Error("Connection timeout"));

    await expect(createEmailSender({ smtp, isProduction: false })(message)).resolves.toEqual({
      provider: "console",
    });
    expect(loggedInfo).toHaveBeenCalledWith(
      expect.objectContaining({ code: "123456" }),
      expect.any(String)
    );
  });

  it("en production, fait remonter l'échec SMTP", async () => {
    sendMail.mockRejectedValue(new Error("Connection timeout"));

    await expect(createEmailSender({ smtp, isProduction: true })(message)).rejects.toThrow(
      "Connection timeout"
    );
  });
});
