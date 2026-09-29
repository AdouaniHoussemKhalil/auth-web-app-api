import path from "path";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import { MFARequestType } from "../../models/enums/MFARequestType";
import { UserRole } from "../../models/enums/UserRole";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "HAK Auth AD",
      version: "1.0.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        AppAuth: {
          type: "apiKey",
          in: "header",
          name: "x-app-id",
        },
        AppSecret: {
          type: "apiKey",
          in: "header",
          name: "x-app-secret",
        },
      },
      schemas: {
        ConsumerRegister: {
          type: "object",
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string" },
            password: { type: "string" },
            confirmPassword: { type: "string" },
            role: { type: "string", enum: Object.values(UserRole) },
          },
          required: ["email", "password", "firstName", "lastName", "role"],
        },
        RefreshToken: {
          type: "object",
          properties: { refreshToken: { type: "string" } },
          required: ["refreshToken"],
        },
        Logout: {
          type: "object",
          properties: {
            refreshToken: { type: "string" },
            allDevices: { type: "boolean", description: "Révoque toutes les sessions" },
          },
          required: ["refreshToken"],
        },
        ConsumerVerifyEmail: {
          type: "object",
          properties: { email: { type: "string" }, code: { type: "string" } },
          required: ["email", "code"],
        },
        ConsumerDeleteAccount: {
          type: "object",
          properties: { password: { type: "string" } },
          required: ["password"],
        },
        TenantUpdateProfile: {
          type: "object",
          properties: { firstName: { type: "string" }, lastName: { type: "string" } },
          required: ["firstName", "lastName"],
        },
        ConsumerStatusUpdate: {
          type: "object",
          description: "false bloque le consumer, true le débloque",
          properties: { isActive: { type: "boolean" } },
          required: ["isActive"],
        },
        TenantDeleteAccount: {
          type: "object",
          description:
            "password pour un compte classique, confirmEmail pour un compte Google sans mot de passe",
          properties: { password: { type: "string" }, confirmEmail: { type: "string" } },
        },
        ConsumerLogin: {
          type: "object",
          properties: {
            email: { type: "string" },
            password: { type: "string" },
          },
          required: ["email", "password"],
        },
        ConsumerForgotPassword: {
          type: "object",
          properties: {
            email: { type: "string" },
          },
          required: ["email"],
        },
        ConsumerVerifyResetPasswordCode: {
          type: "object",
          properties: {
            email: { type: "string" },
            resetCode: { type: "string" },
          },
          required: ["email", "resetCode"],
        },
        ConsumerResetPassword: {
          type: "object",
          properties: {
            email: { type: "string" },
            password: { type: "string" },
            confirmPassword: { type: "string" },
            resetToken: {
              type: "string",
              description: "Jeton renvoyé par /consumers/auth/verifyResetCode",
            },
          },
          required: ["email", "resetToken", "password", "confirmPassword"],
        },
        ConsumerUpdateProfile: {
          type: "object",
          properties: {
            newFirstName: { type: "string" },
            newLastName: { type: "string" },
            userId: { type: "string" },
          },
          required: ["newFirstName", "newLastName", "userId"],
        },
        ConsumerUpdatePassword: {
          type: "object",
          properties: {
            userId: { type: "string" },
            currentPassword: { type: "string" },
            password: { type: "string" },
            confirmPassword: { type: "string" },
          },
          required: ["userId", "currentPassword", "password", "confirmPassword"],
        },
        ConsumerActivateMFA: {
          type: "object",
          properties: {
            userId: { type: "string" },
            activationId: { type: "string" },
          },
          required: ["userId", "activationId"],
        },
        ConsumerDeactivateMFA: {
          type: "object",
          properties: {
            userId: { type: "string" },
            deactivationId: { type: "string" },
          },
          required: ["userId", "deactivationId"],
        },
        ConsumerLoginByMFA: {
          type: "object",
          properties: {
            email: { type: "string" },
            mfaCode: { type: "string" },
          },
          required: ["email", "mfaCode"],
        },
        ConsumerRequestMFA: {
          type: "object",
          properties: {
            email: { type: "string" },
            requestType: {
              type: "string",
              enum: Object.values(MFARequestType),
            },
          },
          required: ["email", "requestType"],
        },
        TenantRegister: {
          type: "object",
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string" },
            password: { type: "string" },
            confirmPassword: { type: "string" },
            role: { type: "string", enum: Object.values(UserRole) },
          },
          required: ["firstName", "lastName", "email", "password", "confirmPassword", "role"],
        },
        TenantLogin: {
          type: "object",
          properties: {
            email: { type: "string" },
            password: { type: "string" },
          },
          required: ["email", "password"],
        },
        TenantGoogleAuth: {
          type: "object",
          properties: {
            token: { type: "string" },
          },
          required: ["token"],
        },
        TenantMFALogin: {
          type: "object",
          properties: {
            email: { type: "string" },
            mfaCode: { type: "string" },
          },
          required: ["email", "mfaCode"],
        },
        ClientAppCreate: {
          type: "object",
          properties: {
            tenantId: { type: "string" },
            name: { type: "string" },
            tokenExpiresIn: { type: "string" },
            refreshTokenExpiresIn: { type: "string", example: "7d" },
            resetTokenExpiresIn: { type: "string" },
            requireEmailVerification: { type: "boolean", default: false },
            mfaVerificationMode: { type: "string", enum: ["code", "link"] },
            mfaExpiresIn: { type: "string" },
            redirectUrl: { type: "string" },
            resetPasswordUrl: { type: "string" },
            logoutUrl: { type: "string" },
            supportEmail: { type: "string" },
            logoUrl: { type: "string" },
            primaryColor: { type: "string" },
          },
          required: ["tenantId", "name", "redirectUrl", "resetPasswordUrl", "supportEmail"],
        },
        ClientAppUpdate: {
          type: "object",
          properties: {
            isActive: { type: "boolean" },
          },
          required: [],
        },
      },
    },
    security: [{ bearerAuth: [] }, { AppAuth: [] }, { AppSecret: [] }],
  },
  // Glob en slashs : sous Windows, path.join produit des antislashs non reconnus par le glob.
  apis: [path.join(__dirname, "../routes/*.{ts,js}").split(path.sep).join("/")],
};

export const specs = swaggerJsDoc(swaggerOptions) as { paths: Record<string, unknown> };

export const setupSwagger = (app: Express) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
};
