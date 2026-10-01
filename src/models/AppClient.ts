import mongoose, { Schema, Document } from "mongoose";

export interface Template {
  id: string;
  isActive: boolean;
}

const TemplateSchema = new Schema<Template>({
  id: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

interface AppClientBranding {
  appName: string;
  primaryColor: string;
  supportEmail: string;
  templates: Template[];
  logoUrl?: string;
}

interface MFASettings {
  verificationMode: "code" | "link";
  expiryMinutes: number;
}

const MFASettingsSchema = new Schema<MFASettings>({
  verificationMode: { type: String, enum: ["code", "link"], default: "code" },
  expiryMinutes: { type: Number, default: 15 },
});

/** Vérification d'e-mail et mot de passe oublié : code à 6 chiffres ou lien. */
export type VerificationMode = "code" | "link";

export interface IAppClient extends Document {
  id: string;
  tenantId: string;
  name: string;
  secretKey: string;
  apiKey: string;
  tokenExpiresIn?: string;
  refreshTokenExpiresIn?: string;
  resetTokenExpiresIn?: string;
  requireEmailVerification: boolean;
  mfaSettings?: MFASettings;
  isActive: boolean;
  allowedOrigins?: string[];
  // Client ID OAuth Google de l'application : active /consumers/auth/google.
  googleClientId?: string;
  redirectUrl: string;
  logoutUrl?: string;
  resetPasswordUrl: string;
  emailVerificationMode: VerificationMode;
  passwordResetMode: VerificationMode;
  // Redirections après un lien de vérification d'e-mail (obligatoires en mode lien).
  emailVerifiedUrl?: string;
  emailVerificationFailedUrl?: string;
  branding?: AppClientBranding;
  scopes?: string[];
  createdAt: Date;
}

const AppClientBrandingSchema = new Schema<AppClientBranding>({
  appName: { type: String, required: true },
  supportEmail: { type: String },
  templates: { type: [TemplateSchema], default: [] },
  logoUrl: { type: String },
  primaryColor: { type: String, default: "#050101ff" },
});

const AppClientSchema = new Schema<IAppClient>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  name: { type: String, required: true },
  secretKey: { type: String, required: true },
  apiKey: { type: String, required: true },
  tokenExpiresIn: { type: String, default: "1h" },
  refreshTokenExpiresIn: { type: String, default: "7d" },
  resetTokenExpiresIn: { type: String, default: "15m" },
  requireEmailVerification: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  allowedOrigins: { type: [String], default: [] },
  googleClientId: { type: String, required: false },
  mfaSettings: { type: MFASettingsSchema, default: {} },
  redirectUrl: { type: String, required: true },
  logoutUrl: { type: String, required: false },
  resetPasswordUrl: { type: String, required: true },
  emailVerificationMode: { type: String, enum: ["code", "link"], default: "code" },
  passwordResetMode: { type: String, enum: ["code", "link"], default: "code" },
  emailVerifiedUrl: { type: String, required: false },
  emailVerificationFailedUrl: { type: String, required: false },
  branding: { type: AppClientBrandingSchema, default: {} },
  scopes: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// Liste des applications d'un tenant.
AppClientSchema.index({ tenantId: 1, isActive: -1, createdAt: -1 });

export default mongoose.model<IAppClient>("AppClient", AppClientSchema);
