export interface SecondaryUserAccessMethod {
  code: string;
  expires: Date;
  type: SecondaryUserAccessMethodType;
}

export enum SecondaryUserAccessMethodType {
  MFA = "MFA",
  ForgotPassword = "forgotPassword"
}