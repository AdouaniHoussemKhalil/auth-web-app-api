export interface SecondaryUserAccessMethod {
  code: string;
  expires: Date;
  type: SecondaryUserAccessMethodType;
  attempts?: number;
}

export enum SecondaryUserAccessMethodType {
  MFA = "MFA",
  ForgotPassword = "forgotPassword",
  ResetPassword = "resetPassword",
}
