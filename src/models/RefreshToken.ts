import mongoose, { Document, Schema } from "mongoose";

export type TokenSubjectType = "tenant" | "consumer";

// Refresh token émis : permet la rotation (usage unique) et la révocation (déconnexion).
export interface IRefreshToken extends Document {
  jti: string;
  subjectType: TokenSubjectType;
  subjectId: string;
  // Application du consumer ; vide pour un tenant.
  clientId?: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  jti: { type: String, required: true, unique: true },
  subjectType: { type: String, enum: ["tenant", "consumer"], required: true },
  subjectId: { type: String, required: true },
  clientId: { type: String },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

RefreshTokenSchema.index({ subjectType: 1, subjectId: 1, clientId: 1 });
// MongoDB supprime automatiquement les tokens expirés.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model<IRefreshToken>("RefreshToken", RefreshTokenSchema);
