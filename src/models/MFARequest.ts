import mongoose, { Document, Schema } from "mongoose";
import { MFARequestType } from "./enums/MFARequestType";
import { MFARequestStatus } from "./enums/MFARequestStatus";
import { MFAMethod } from "./enums/MFAMethod";


interface Verification {
  type: "code" | "link";
  code?: string;
  linkId?: string;
}

export interface IMFARequest extends Document {
  userId: string;
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

const MFARequestSchema = new Schema<IMFARequest>({
  userId: { type: String , required: true },
  clientId: { type: String, required: true },
  type: { type: String, enum: Object.values(MFARequestType), required: true },
  method: { type: String, enum: Object.values(MFAMethod), required: true },
  verification: { type: VerificationSchema , required: true },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: Object.values(MFARequestStatus), default: MFARequestStatus.PENDING },
  createdAt: { type: Date, default: Date.now },
});

export const MFARequest = mongoose.model<IMFARequest>("MFARequest", MFARequestSchema);
