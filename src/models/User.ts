import mongoose, { Document, Schema } from "mongoose";

interface ResetPassword {
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  resetPassword?: ResetPassword;
  role: string;
  createdOn: Date;
}

const resetPasswordSchema = new Schema<ResetPassword>({
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
});

const UserSchema: Schema = new Schema<IUser>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: false, default: "user" },
  resetPassword: resetPasswordSchema,
  createdOn: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model<IUser>("User", UserSchema);
export default User;
