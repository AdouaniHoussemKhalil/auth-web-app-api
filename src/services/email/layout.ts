import { EmailBranding, normalizeColor } from "./branding";

/** Contenu d'un e-mail, mis en forme par `renderEmail`. */
export interface EmailContent {
  subject: string;
  /** Texte d'aperçu affiché dans la boîte de réception, après l'objet. */
  preheader: string;
  title: string;
  paragraphs: string[];
  /** Code à usage unique, mis en évidence. */
  code?: string;
  /** Bouton (lien de vérification). */
  button?: { label: string; url: string };
  /** Phrase sur la durée de validité, sous le code ou le bouton. */
  expiry?: string;
  /** Mention de sécurité, en petit (« si vous n'êtes pas à l'origine… »). */
  notice?: string;
}

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Texte lisible sur un fond de cette couleur (luminance relative WCAG). */
const textColorOn = (hex: string) => {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#1F1E1D" : "#FFFFFF";
};

/** Teinte très claire de la couleur (fond du bloc de code). */
const tint = (hex: string, ratio = 0.9) =>
  `#${channels(hex)
    .map((c) =>
      Math.round(c + (255 - c) * ratio)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * Mise en page commune : tableaux et styles en ligne (Gmail, Outlook, Apple Mail), largeur 560 px
 * max. Toutes les valeurs dynamiques sont échappées : un nom d'utilisateur ne peut pas injecter de HTML.
 */
export const renderEmail = (
  content: EmailContent,
  { recipientFullName, branding }: { recipientFullName: string; branding: EmailBranding }
): { html: string; text: string } => {
  const color = normalizeColor(branding.primaryColor);
  const onColor = textColorOn(color);
  const appName = escapeHtml(branding.appName);

  const header = branding.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${appName}" height="40" style="display:block;height:40px;max-width:200px;border:0;outline:none;text-decoration:none;">`
    : `<span style="font-size:20px;font-weight:700;color:#1F1E1D;">${appName}</span>`;

  const code = content.code
    ? `<tr><td style="padding:8px 0 4px;">
        <div style="background:${tint(color)};border:1px solid ${color};border-radius:10px;padding:18px;text-align:center;font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#1F1E1D;">${escapeHtml(content.code)}</div>
      </td></tr>`
    : "";

  const button = content.button
    ? `<tr><td style="padding:8px 0 4px;">
        <a href="${escapeHtml(content.button.url)}" style="display:inline-block;background:${color};color:${onColor};font-weight:600;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:8px;">${escapeHtml(content.button.label)}</a>
        <p style="margin:16px 0 0;font-size:12px;color:#6B6964;">Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br><span style="word-break:break-all;color:#4A4843;">${escapeHtml(content.button.url)}</span></p>
      </td></tr>`
    : "";

  const paragraphs = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3D3B37;">${escapeHtml(p)}</p>`
    )
    .join("");

  const support = branding.supportEmail
    ? `Une question ? Écrivez-nous à <a href="mailto:${escapeHtml(branding.supportEmail)}" style="color:#6B6964;">${escapeHtml(branding.supportEmail)}</a>.<br>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F3EF;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3EF;font-family:${FONT};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 16px;">${header}</td></tr>
      <tr><td style="background:#FFFFFF;border-radius:12px;border-top:4px solid ${color};padding:32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td>
            <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#1F1E1D;">${escapeHtml(content.title)}</h1>
            <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3D3B37;">Bonjour ${escapeHtml(recipientFullName)},</p>
            ${paragraphs}
          </td></tr>
          ${code}${button}
          ${content.expiry ? `<tr><td style="padding:12px 0 0;font-size:13px;color:#6B6964;">${escapeHtml(content.expiry)}</td></tr>` : ""}
          ${content.notice ? `<tr><td style="padding:24px 0 0;"><div style="border-top:1px solid #ECEAE4;padding-top:16px;font-size:13px;line-height:1.5;color:#6B6964;">${escapeHtml(content.notice)}</div></td></tr>` : ""}
        </table>
      </td></tr>
      <tr><td style="padding:20px 4px 0;font-size:12px;line-height:1.6;color:#8A877F;">
        ${support}Vous recevez cet e-mail car un compte ${appName} est associé à cette adresse.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    branding.appName,
    "",
    content.title,
    "",
    `Bonjour ${recipientFullName},`,
    "",
    ...content.paragraphs.flatMap((p) => [p, ""]),
    ...(content.code ? [content.code, ""] : []),
    ...(content.button ? [`${content.button.label} : ${content.button.url}`, ""] : []),
    ...(content.expiry ? [content.expiry, ""] : []),
    ...(content.notice ? [content.notice, ""] : []),
    "—",
    ...(branding.supportEmail ? [`Une question ? ${branding.supportEmail}`] : []),
    `Vous recevez cet e-mail car un compte ${branding.appName} est associé à cette adresse.`,
  ].join("\n");

  return { html, text };
};

/** 15 min -> « 15 minutes », 1 h -> « 1 heure », 24 h -> « 24 heures », 7 j -> « 7 jours ». */
export const formatDuration = (durationMs: number) => {
  const minutes = Math.max(1, Math.round(durationMs / 60_000));
  const plural = (n: number, unit: string) => `${n} ${unit}${n > 1 ? "s" : ""}`;
  if (minutes % (60 * 24) === 0 && minutes > 60 * 24) return plural(minutes / (60 * 24), "jour");
  if (minutes % 60 === 0) return plural(minutes / 60, "heure");
  return plural(minutes, "minute");
};
