🧩 Auth API — Multi-Application Authentication Service

Auth API is a reusable authentication service built with Node.js + TypeScript.
It can be integrated with multiple client applications (web, mobile, back-end services, etc.) by registering each application as an App Client.
Each App Client receives unique credentials (appId, appSecret) to securely interact with the API.

🚀 Features

Multi-App Architecture – Each external app must create an AppClient to obtain its own appId and appSecret.

Authentication – User login, registration, and JWT-based authentication.

App-Level Security – Every API request is validated using the app’s credentials (x-app-id, x-app-secret).

Password Management – Forgot password, reset password, and password update.

Profile Management – Securely update user profile information.

MFA Support – Optional Multi-Factor Authentication (MFA) flow for login.

Email Notifications – Sends emails for verification and password reset via SMTP or external providers (e.g., SendGrid).

Clean Architecture – Clear separation of concerns (controllers, handlers, services, middleware).

Validation – Request validation using Zod.

Database – MongoDB with Mongoose schema models.
