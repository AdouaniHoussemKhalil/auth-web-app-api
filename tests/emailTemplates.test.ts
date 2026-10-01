import {
  DASHBOARD_BRANDING,
  emailBrandingOf,
  normalizeColor,
} from "../src/services/email/branding";
import { escapeHtml, formatDuration, renderEmail } from "../src/services/email/layout";
import { templates } from "../src/services/email/models/Template";
import { IAppClient } from "../src/models/AppClient";
import sendTemplateEmail from "../src/services/email/sendMails";

// Capture le message transmis au provider, sans rien envoyer.
const mockSend = jest.fn();
jest.mock("../src/services/email/emailSender", () => ({
  createEmailSender: () => (message: unknown) => mockSend(message),
}));

const lingutrack = {
  appName: "Lingutrack",
  primaryColor: "#2563EB",
  logoUrl: "https://cdn.lingutrack.test/logo.png",
  supportEmail: "support@lingutrack.test",
};

const render = (templateId: keyof typeof templates, variable = "123456", expiresIn?: string) =>
  renderEmail(templates[templateId].content({ appName: lingutrack.appName, variable, expiresIn }), {
    recipientFullName: "Bob Durand",
    branding: lingutrack,
  });

afterEach(() => mockSend.mockReset());

describe("Mise en page des e-mails", () => {
  it("reprend le logo, le nom, la couleur et l'e-mail de support de l'application", () => {
    const { html } = render("loginByCodeMFA", "123456", "15 minutes");

    expect(html).toContain('src="https://cdn.lingutrack.test/logo.png"');
    expect(html).toContain('alt="Lingutrack"');
    expect(html).toContain("border-top:4px solid #2563EB");
    expect(html).toContain("border:1px solid #2563EB");
    expect(html).toContain("mailto:support@lingutrack.test");
    expect(html).toContain("un compte Lingutrack est associé");
    expect(html).toContain("Bonjour Bob Durand,");
    expect(html).toContain(">123456</div>");
    expect(html).toContain("Ce code expire dans 15 minutes.");
    expect(html).not.toContain("pixabay");
  });

  it("affiche le nom de l'application à la place du logo s'il n'y en a pas", () => {
    const { html } = renderEmail(
      templates.emailVerification.content({ appName: "Lingutrack", variable: "654321" }),
      { recipientFullName: "Bob", branding: { appName: "Lingutrack", primaryColor: "#2563EB" } }
    );

    expect(html).not.toContain("<img");
    expect(html).toContain(">Lingutrack</span>");
    expect(html).not.toContain("Une question ?");
  });

  it("met un bouton à la couleur de l'application pour les liens, avec un texte lisible", () => {
    const link = "https://lingutrack.test/auth/MFA/activate?r=abc";
    const dark = render("mfaActivationRequest", link).html;
    const light = renderEmail(
      templates.mfaActivationRequest.content({ appName: "X", variable: link }),
      {
        recipientFullName: "Bob",
        branding: { appName: "X", primaryColor: "#FDE047" },
      }
    ).html;

    expect(dark).toContain(`href="${link}"`);
    expect(dark).toContain("background:#2563EB;color:#FFFFFF");
    expect(light).toContain("background:#FDE047;color:#1F1E1D");
  });

  it("échappe les données : un nom ne peut pas injecter de HTML", () => {
    const { html } = renderEmail(
      templates.loginByCodeMFA.content({ appName: "A&B", variable: "1" }),
      {
        recipientFullName: '<a href="https://evil.test">Cliquez</a>',
        branding: { appName: "A&B", primaryColor: "#000000" },
      }
    );

    expect(html).not.toContain('<a href="https://evil.test">');
    expect(html).toContain("&lt;a href=&quot;https://evil.test&quot;&gt;");
    expect(html).toContain("A&amp;B");
    expect(escapeHtml(`'"<>&`)).toBe("&#39;&quot;&lt;&gt;&amp;");
  });

  it("produit une version texte brut avec le code", () => {
    const { text } = render("forgotPassword", "987654", "15 minutes");

    expect(text).toContain("Réinitialisez votre mot de passe");
    expect(text).toContain("987654");
    expect(text).toContain("Ce code expire dans 15 minutes.");
    expect(text).toContain("Une question ? support@lingutrack.test");
    expect(text).not.toMatch(/<[a-z]/i);
  });

  it("donne un objet et un aperçu propres à chaque e-mail", () => {
    const content = templates.loginByCodeMFA.content({ appName: "Lingutrack", variable: "112233" });

    expect(content.subject).toBe("Votre code de connexion Lingutrack");
    expect(content.preheader).toContain("112233");
  });
});

describe("Branding", () => {
  it("normalise les couleurs et remplace une valeur invalide", () => {
    expect(normalizeColor("#abc")).toBe("#AABBCC");
    expect(normalizeColor("#2563eb")).toBe("#2563EB");
    expect(normalizeColor("#050101ff")).toBe("#050101");
    expect(normalizeColor("red")).toBe("#1F1E1D");
    expect(normalizeColor(undefined, "#D97757")).toBe("#D97757");
  });

  it("se construit depuis une application, avec ses valeurs de repli", () => {
    const app = {
      name: "Lingutrack",
      branding: { appName: "", primaryColor: "#050101ff", supportEmail: "s@l.test", templates: [] },
    } as unknown as IAppClient;

    expect(emailBrandingOf(app)).toEqual({
      appName: "Lingutrack",
      primaryColor: "#050101",
      logoUrl: undefined,
      supportEmail: "s@l.test",
    });
  });

  it("formate les durées", () => {
    expect(formatDuration(15 * 60 * 1000)).toBe("15 minutes");
    expect(formatDuration(60 * 1000)).toBe("1 minute");
    expect(formatDuration(60 * 60 * 1000)).toBe("1 heure");
    expect(formatDuration(24 * 60 * 60 * 1000)).toBe("24 heures");
    expect(formatDuration(7 * 24 * 60 * 60 * 1000)).toBe("7 jours");
  });
});

describe("Envoi", () => {
  it("envoie le HTML, le texte brut et l'objet, au nom de l'application", async () => {
    await sendTemplateEmail(templates.emailVerification.id, {
      recipient: { email: "bob@test.com", fullName: "Bob Durand" },
      branding: lingutrack,
      variable: "123456",
      expiresInMs: 24 * 60 * 60 * 1000,
    });

    const message = mockSend.mock.calls[0][0];
    expect(message.from).toMatch(/^"Lingutrack" </);
    expect(message.to).toBe("bob@test.com");
    expect(message.subject).toBe("Votre code de vérification Lingutrack");
    expect(message.html).toContain("Ce code expire dans 24 heures.");
    expect(message.text).toContain("123456");
    expect(message.variable).toBe("123456");
  });

  it("utilise l'identité du dashboard pour les e-mails des tenants", async () => {
    await sendTemplateEmail(templates.loginByCodeMFA.id, {
      recipient: { email: "alice@test.com", fullName: "Alice" },
      variable: "111111",
    });

    const message = mockSend.mock.calls[0][0];
    expect(message.from).toContain(`"${DASHBOARD_BRANDING.appName}"`);
    expect(message.html).toContain("#D97757");
  });

  it("retire les guillemets du nom d'expéditeur", async () => {
    await sendTemplateEmail(templates.loginByCodeMFA.id, {
      recipient: { email: "a@test.com", fullName: "A" },
      branding: { appName: 'Mon "app"', primaryColor: "#000000" },
      variable: "1",
    });

    expect(mockSend.mock.calls[0][0].from).toMatch(/^"Mon app" </);
  });
});
