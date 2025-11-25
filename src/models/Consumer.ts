import mongoose, { Schema } from "mongoose";
import { IUser, UserSchema } from "./User";

export interface IConsumer extends IUser {
  clientId: string;
}

const ConsumerSchema = new Schema<IConsumer>({
  ...UserSchema.obj,
  clientId: { type: String, required: true },
});

ConsumerSchema.index({ clientId: 1, email: 1 }, { unique: true });

export const Consumer = mongoose.model<IConsumer>("Consumer", ConsumerSchema, "consumers");
