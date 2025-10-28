import mongoose, { Document, Schema } from "mongoose";
import { MFAMethod } from "./User";

export enum MFARequestType {
  ACTIVATE = "activate",
  DEACTIVATE = "deactivate",
}

export enum MFARequestStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  EXPIRED = "expired",
}

interface Verification {
  type: "code" | "link";
  code?: string;
  linkId?: string;
}

export interface IUserMFARequest extends Document {
  userId: mongoose.Types.ObjectId;
  clientId: string;
  type: MFARequestType;
  method: MFAMethod;
  verification: Verification;
  expiresAt: Date;
  status: MFARequestStatus;
  createdAt: Date;
}

const VerificationSchema = new Schema<Verification>({
  type: { type: String, enum: ["code", "link"], required: true },
  code: { type: String },
  linkId: { type: String },
});

const UserMFARequestSchema = new Schema<IUserMFARequest>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  clientId: { type: String, required: true },
  type: { type: String, enum: Object.values(MFARequestType), required: true },
  method: { type: String, enum: Object.values(MFAMethod), required: true },
  verification: { type: VerificationSchema , required: true },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: Object.values(MFARequestStatus), default: MFARequestStatus.PENDING },
  createdAt: { type: Date, default: Date.now },
});

export const UserMFARequest = mongoose.model<IUserMFARequest>("UserMFARequest", UserMFARequestSchema);
