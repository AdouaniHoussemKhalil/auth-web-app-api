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
  verificationMode: "code" | "link" | "both";
  expiryMinutes: number; 
}

const MFASettingsSchema = new Schema<MFASettings>({
  verificationMode: { type: String, enum: ["code", "link", "both"], default: "code" },
  expiryMinutes: { type: Number, default: 15 },
});

export interface IAppClient extends Document {
  id: string;
  tenantId:  string;
  name: string;
  secretKey: string;
  apiKey: string;
  tokenExpiresIn?: string;
  resetTokenExpiresIn?: string;
  mfaSettings?: MFASettings; 
  isActive: boolean;
  allowedOrigins?: string[];
  redirectUrl: string;
  logoutUrl?: string;
  resetPasswordUrl: string;
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
  tenantId: { type:  String, required: true },
  name: { type: String, required: true },
  secretKey: { type: String, required: true },
  apiKey: { type: String, required: true },
  tokenExpiresIn: { type: String, default: "7d" },
  resetTokenExpiresIn: { type: String, default: "15m" },
  isActive: { type: Boolean, default: true },
  allowedOrigins: { type: [String], default: [] },
  mfaSettings: { type: MFASettingsSchema, default: {} },
  redirectUrl: { type: String, required: true },
  logoutUrl: { type: String, required: false },
  resetPasswordUrl: { type: String, required: true },
  branding: { type: AppClientBrandingSchema, default: {} },
  scopes: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IAppClient>("AppClient", AppClientSchema);
