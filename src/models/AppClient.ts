import mongoose, { Schema, Document } from "mongoose";

export interface IAppClient extends Document {
  appId: string;
  name: string;
  secretKey: string;
  apiKey: string;
  tokenExpiresIn?: string;
  isActive: boolean;
  allowedOrigins?: string[];
  redirectUrl: string;
  branding?: {
    appName: string;
    logoUrl?: string;
    supportEmail?: string;
  };
  scopes?: string[];
  createdAt: Date;
}

const AppClientSchema = new Schema<IAppClient>({
  appId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  secretKey: { type: String, required: true },
  apiKey: { type: String, required: true },
  tokenExpiresIn: { type: String, default: "1h" },
  isActive: { type: Boolean, default: true },
  allowedOrigins: { type: [String], default: [] },
  redirectUrl: { type: String, required: true },
  branding: {
    appName: { type: String, required: true },
    logoUrl: { type: String },
    supportEmail: { type: String }
  },
  scopes: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IAppClient>("AppClient", AppClientSchema);
