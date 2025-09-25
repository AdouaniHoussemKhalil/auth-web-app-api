Auth API

Auth API is a Node.js + TypeScript application providing the back-end for a full authentication system. It supports login, registration, password reset, and profile management, following modern architecture and best practices.

Features

Authentication – Login, registration, JWT-based authentication, and token management.

Password Management – Forgot password and reset password functionality.

Profile Management – Update user information securely.

Secure Routes – Middleware for authentication, error handling, and request validation.

Email Notifications – Sends emails using a personal SMTP server.

Validation – Input validation using Zod.

Clean Architecture – Controllers, handlers, services, and middleware separated for maintainable code.

Database – MongoDB with Mongoose for schema definition and database interaction.

Tech Stack

Node.js + TypeScript

Express.js for API routing

MongoDB + Mongoose

JWT for authentication

Zod for request validation

Nodemailer for sending emails

Middleware for validation, error handling, and security

Requirements

Node.js (v16 or higher recommended)

MongoDB running locally or remotely

Access to an SMTP server for sending emails


npm install 
npm run dev