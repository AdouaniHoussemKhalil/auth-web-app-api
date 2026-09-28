import { Document, Schema } from "mongoose";
import {
  SecondaryUserAccessMethod,
  SecondaryUserAccessMethodType,
} from "./subdocuments/SecondaryAccessMethod";
import { UserRole } from "./enums/UserRole";
import { MFAMethod } from "./enums/MFAMethod";

export interface IUser extends Document {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  scopes: string[];
  isActive: boolean;
  isByGoogle?: boolean;
  isEmailVerified?: boolean;
  // Codes à usage unique en attente, un par type (MFA, mot de passe oublié...).
  oneTimeCodes?: Map<string, PendingCode>;
  // Ancien emplacement unique, encore lu pour les codes émis avant la migration.
  secondaryUserAccess?: SecondaryUserAccessMethod;
  isMFAActivated?: boolean;
  role?: UserRole;
  usedMFAMethod?: MFAMethod;
  usedMFAActivatedAt?: Date;
  createdOn: Date;
}

const secondaryUserAccess = new Schema<SecondaryUserAccessMethod>({
  code: { type: String },
  expires: { type: Date },
  type: { type: String, enum: Object.values(SecondaryUserAccessMethodType), required: true },
  attempts: { type: Number, default: 0 },
});

export type PendingCode = { code: string; expires: Date; attempts: number };

const pendingCode = new Schema<PendingCode>(
  {
    code: { type: String, required: true },
    expires: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { _id: false }
);

export const UserSchema: Schema = new Schema<IUser>({
  id: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: false },
  scopes: { type: [String], required: true, default: [] },
  role: {
    type: String,
    enum: [UserRole.ADMIN, UserRole.CONSUMER, UserRole.TENANT],
    required: true,
    default: UserRole.CONSUMER,
  },
  isActive: { type: Boolean, required: false, default: true },
  isByGoogle: { type: Boolean, required: false, default: false },
  isEmailVerified: { type: Boolean, required: false, default: false },
  usedMFAMethod: { type: String, enum: Object.values(MFAMethod), required: false },
  isMFAActivated: { type: Boolean, required: false, default: false },
  oneTimeCodes: { type: Map, of: pendingCode, default: {} },
  secondaryUserAccess: secondaryUserAccess,
  createdOn: {
    type: Date,
    default: Date.now,
  },
  usedMFAActivatedAt: { type: Date },
});
