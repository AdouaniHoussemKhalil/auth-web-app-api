import config from "config";
import { IAppClient } from "../../models/AppClient";

/** Identité visuelle d'un e-mail : celle de l'application du consumer, ou celle du dashboard. */
export interface EmailBranding {
  appName: string;
  /** Couleur #RRGGBB, normalisée par `normalizeColor`. */
  primaryColor: string;
  logoUrl?: string;
  supportEmail?: string;
}

const FALLBACK_COLOR = "#1F1E1D";

// E-mails du dashboard (tenants) : couleurs de la charte de la console.
export const DASHBOARD_BRANDING: EmailBranding = {
  appName: config.has("email.info.from") ? config.get<string>("email.info.from") : "Auth Console",
  primaryColor: "#D97757",
};

/** #RGB, #RRGGBB ou #RRGGBBAA (transparence ignorée) -> #RRGGBB ; sinon la couleur de repli. */
export const normalizeColor = (color: string | undefined, fallback = FALLBACK_COLOR) => {
  const hex = color?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
  if (!hex) return fallback;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex.slice(0, 6);
  return `#${full.toUpperCase()}`;
};

/** Branding d'une application, avec des valeurs de repli pour les champs absents. */
export const emailBrandingOf = (appClient: IAppClient): EmailBranding => ({
  appName: appClient.branding?.appName || appClient.name,
  primaryColor: normalizeColor(appClient.branding?.primaryColor),
  logoUrl: appClient.branding?.logoUrl || undefined,
  supportEmail: appClient.branding?.supportEmail || undefined,
});
