import mongoose, { Schema } from "mongoose";
import { IUser, UserSchema } from "./User";

export interface IConsumer extends IUser {
  clientId: string;
}

const ConsumerSchema = new Schema<IConsumer>({
  ...UserSchema.obj,
  clientId: { type: String, required: true },
});

ConsumerSchema.index({ id: 1 }, { unique: true });
ConsumerSchema.index({ clientId: 1, email: 1 }, { unique: true });
// Liste des consumers d'une application (tri par statut puis date d'inscription).
ConsumerSchema.index({ clientId: 1, isActive: -1, createdOn: -1 });

export const Consumer = mongoose.model<IConsumer>("Consumer", ConsumerSchema, "consumers");
