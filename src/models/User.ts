import mongoose, { Document, Schema } from "mongoose";

interface SecondaryUserAccess {
  code?: string;
  expires?: Date;
  type?: SecondaryUserAccessType;
}

export enum SecondaryUserAccessType {
  MFA = "MFA",
  ForgotPassword = "forgotPassword"
}

interface IUser extends Document {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  secondaryUserAccess?: SecondaryUserAccess;
  isMFAActivated?: boolean;
  role: string;
  usedMFAMethod?: MFAMethod;
  usedMFAActivatedAt?: Date;
  createdOn: Date;
}

export enum MFAMethod {
  TOTP = "totp",
  EMAIL = "email",
  SMS = "sms"
}

const secondaryUserAccess = new Schema<SecondaryUserAccess>({
  code: { type: String },
  expires: { type: Date },
  type: { type: String, enum: Object.values(SecondaryUserAccessType), required: true }
});

const UserSchema: Schema = new Schema<IUser>({
  clientId: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true},
  password: { type: String, required: true },
  role: { type: String, required: false, default: "user" },
  usedMFAMethod: { type: String, enum: Object.values(MFAMethod), required: false },
  isMFAActivated: { type: Boolean, required: false, default: false },
  secondaryUserAccess: secondaryUserAccess,
  createdOn: {
    type: Date,
    default: Date.now,
  },
  usedMFAActivatedAt: { type: Date },
});

UserSchema.index({ clientId: 1, email: 1 }, { unique: true });

const User = mongoose.model<IUser>("User", UserSchema);
export default User;
