/**
 * Aperçu local des e-mails : écrit un fichier HTML par template (et un index) avec le branding donné.
 *   npx ts-node scripts/preview-emails.ts [dossier] [--name Lingutrack] [--color #2563EB] [--logo URL] [--support e-mail]
 * Rien n'est envoyé.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { EmailBranding, normalizeColor } from "../src/services/email/branding";
import { formatDuration, renderEmail } from "../src/services/email/layout";
import { templates, TemplateId } from "../src/services/email/models/Template";

const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const outDir = args[0] && !args[0].startsWith("--") ? args[0] : "email-previews";

const branding: EmailBranding = {
  appName: option("name") ?? "Lingutrack",
  primaryColor: normalizeColor(option("color") ?? "#2563EB"),
  logoUrl: option("logo"),
  supportEmail: option("support") ?? "support@lingutrack.test",
};

const samples: Record<TemplateId, { variable: string; expiresInMs?: number }> = {
  emailVerification: { variable: "482913", expiresInMs: 24 * 60 * 60 * 1000 },
  forgotPassword: { variable: "730518", expiresInMs: 15 * 60 * 1000 },
  loginByCodeMFA: { variable: "195274", expiresInMs: 15 * 60 * 1000 },
  activateMFA: { variable: "604821", expiresInMs: 15 * 60 * 1000 },
  deactivateMFA: { variable: "318640", expiresInMs: 15 * 60 * 1000 },
  mfaActivationRequest: {
    variable: "https://app.example.com/auth/MFA/activate?r=3f9c1a",
    expiresInMs: 15 * 60 * 1000,
  },
  mfaDeactivationRequest: {
    variable: "https://app.example.com/auth/MFA/deactivate?r=8b2e7d",
    expiresInMs: 15 * 60 * 1000,
  },
  successfullyActivatedMFA: { variable: "" },
  successfullyDeactivatedMFA: { variable: "" },
};

mkdirSync(outDir, { recursive: true });
const links: string[] = [];
for (const [id, { variable, expiresInMs }] of Object.entries(samples) as [
  TemplateId,
  (typeof samples)[TemplateId],
][]) {
  const content = templates[id].content({
    appName: branding.appName,
    variable,
    expiresIn: expiresInMs ? formatDuration(expiresInMs) : undefined,
  });
  const { html } = renderEmail(content, { recipientFullName: "Bob Durand", branding });
  writeFileSync(join(outDir, `${id}.html`), html);
  links.push(`<li><a href="${id}.html" target="preview">${content.subject}</a></li>`);
}
writeFileSync(
  join(outDir, "index.html"),
  `<!DOCTYPE html><html lang="fr"><meta charset="utf-8"><title>Aperçu des e-mails</title>
<body style="margin:0;display:flex;font-family:sans-serif;height:100vh">
<ul style="width:300px;padding:16px 16px 16px 32px;overflow:auto;line-height:1.8">${links.join("")}</ul>
<iframe name="preview" src="loginByCodeMFA.html" style="flex:1;border:0;border-left:1px solid #ddd"></iframe>
</body></html>`
);
console.log(`Aperçus écrits dans ${outDir}/index.html`);
