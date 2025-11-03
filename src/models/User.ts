import { Document, Schema } from "mongoose";
import { SecondaryUserAccessMethod, SecondaryUserAccessMethodType } from "./subdocuments/SecondaryAccessMethod";
import { UserRole } from "./enums/UserRole";
import { MFAMethod } from "./enums/MFAMethod";


export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  scopes: string[];
  isActive: boolean;
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
  type: { type: String, enum: Object.values(SecondaryUserAccessMethodType), required: true }
});

export const UserSchema: Schema = new Schema<IUser>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true},
  password: { type: String, required: true },
  scopes: { type: [String], required: true, default: [] },
  role: {type: String, enum: [UserRole.ADMIN, UserRole.CONSUMER, UserRole.TENANT], required: true, default: UserRole.CONSUMER },
  isActive: { type: Boolean, required: false, default: true },
  usedMFAMethod: { type: String, enum: Object.values(MFAMethod), required: false },
  isMFAActivated: { type: Boolean, required: false, default: false },
  secondaryUserAccess: secondaryUserAccess,
  createdOn: {
    type: Date,
    default: Date.now,
  },
  usedMFAActivatedAt: { type: Date },
});
    