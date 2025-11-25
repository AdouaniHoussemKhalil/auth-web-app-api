import mongoose, { Schema } from "mongoose";
import { IUser, UserSchema } from "./User";

export interface ITenant extends IUser {
  secretKey: string;
}

const TenantSchema = new Schema<ITenant>({
  ...UserSchema.obj,
  secretKey: { type: String, required: true },
});

TenantSchema.index({ email: 1 }, { unique: true });

export const Tenant = mongoose.model<ITenant>("Tenant", TenantSchema, "tenants");
