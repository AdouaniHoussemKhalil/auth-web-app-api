# Auth API — service d'authentification multi-applications

API d'authentification réutilisable (Node.js + TypeScript + Express + MongoDB), pensée comme un petit « Auth0 maison » :
un **tenant** (le développeur ou l'entreprise) crée un compte, déclare une ou plusieurs **applications clientes**, et chaque application
délègue à l'API l'inscription, la connexion, les sessions, le mot de passe et le MFA de ses propres utilisateurs (**consumers**).

---

## Sommaire

- [Concepts](#concepts)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Structure du projet](#structure-du-projet)
- [Authentification des requêtes](#authentification-des-requêtes)
- [Endpoints](#endpoints)
- [Parcours d'intégration](#parcours-dintégration)
- [Sécurité](#sécurité)
- [Format des réponses d'erreur](#format-des-réponses-derreur)
- [Limites connues](#limites-connues)

---

## Concepts

```
Tenant (propriétaire)                   ── s'authentifie sur /tenants/*
  └── AppClient (application cliente)   ── gérée via /config/apps/*
        └── Consumer (utilisateur final) ── s'authentifie sur /consumers/*
```

| Entité           | Rôle                                                                                                                                                                                            | Collection MongoDB |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **Tenant**       | Compte propriétaire. Son `secretKey` (jamais exposé) sert à signer ses JWT.                                                                                                                     | `tenants`          |
| **AppClient**    | Application enregistrée par un tenant. Son `id` sert de `x-app-id` et son `secretKey` de `x-app-secret`. Porte les réglages : durées des tokens, URLs, mode MFA, vérification e-mail, branding. | `appclients`       |
| **Consumer**     | Utilisateur final d'une application. Unique par couple `(clientId, email)` : le même e-mail peut exister dans deux applications.                                                                | `consumers`        |
| **MFARequest**   | Demande d'activation / désactivation du MFA (code ou lien, stocké haché).                                                                                                                       | `mfarequests`      |
| **RefreshToken** | Refresh token émis (`jti`), pour la rotation et la révocation. Purgé automatiquement à expiration.                                                                                              | `refreshtokens`    |

**Isolation des tokens** : chaque JWT est signé avec une clé dérivée (`sha256(secretKey + "_access" | "_refresh")`) du secret
du tenant ou de l'application. Un token émis pour une application n'est pas valide pour une autre, et changer le secret
d'une application invalide toutes les sessions de ses consumers.

## Fonctionnalités

**Tenants**

- Inscription par e-mail / mot de passe, ou via Google (ID token Google).
- Connexion en deux étapes : mot de passe, puis code à 6 chiffres envoyé par e-mail.
- Sessions : refresh token avec rotation, déconnexion (une session ou toutes).
- Gestion des applications clientes : création, activation / désactivation, consultation, rotation du secret.
- Consultation des consumers de leurs applications.

**Consumers** (appels signés par les identifiants de l'application)

- Inscription avec vérification de l'adresse e-mail (obligatoire ou non, selon l'application).
- Connexion, refresh token avec rotation, déconnexion.
- Mot de passe oublié : code par e-mail → jeton de réinitialisation → nouveau mot de passe.
- Modification du mot de passe et du profil.
- MFA par e-mail : activation / désactivation par code ou par lien, puis connexion par code.

**Transverse**

- Validation des corps de requête avec **Zod**.
- E-mails HTML (en français) via **Nodemailer / SMTP**, personnalisés avec le nom, la couleur et le logo de l'application.
- Documentation **Swagger** générée depuis les commentaires JSDoc des routes.

## Stack technique

- Node.js 20+, TypeScript, Express 4
- MongoDB + Mongoose 8
- `jsonwebtoken`, `bcrypt`, `zod`, `nodemailer`, `google-auth-library`
- `helmet`, `express-rate-limit`, `cors`
- `config` (fichiers JSON par environnement)
- Jest + Supertest + mongodb-memory-server pour les tests
- ESLint 9 + Prettier, GitHub Actions, Docker

## Démarrage rapide

### Avec Docker

```bash
docker compose up --build
```

Lance MongoDB et l'API sur `http://localhost:8080`. Pour l'envoi d'e-mails et la connexion Google, compléter la variable
`NODE_CONFIG` dans `docker-compose.yml` (voir [Configuration](#configuration)).

### En local

Prérequis : Node.js 20+, une base MongoDB (locale ou Atlas), un compte SMTP (Gmail avec mot de passe d'application, par exemple).

```bash
npm install
# renseigner la configuration dans config/local.json (voir ci-dessous)
npm run dev
```

- API : `http://localhost:8080`
- Swagger UI : `http://localhost:8080/api-docs`

## Scripts

| Commande                     | Rôle                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| `npm run dev`                | Serveur de développement avec rechargement (nodemon + ts-node) |
| `npm run build`              | Compilation TypeScript vers `dist/`                            |
| `npm start`                  | Lance la version compilée (`dist/index.js`)                    |
| `npm run typecheck`          | Vérification des types (sources et tests)                      |
| `npm run lint` / `lint:fix`  | ESLint + Prettier                                              |
| `npm run format`             | Formatage Prettier                                             |
| `npm test` / `test:coverage` | Tests d'intégration (MongoDB en mémoire, e-mails simulés)      |

La CI GitHub Actions exécute `typecheck`, `lint`, `test` et `build` sur chaque PR vers `develop` et `main`.

## Configuration

La configuration est gérée par le paquet [`config`](https://github.com/node-config/node-config) :

- `config/default.json` : valeurs par défaut (sans secrets) ;
- `config/production.json` : chargé quand `NODE_ENV=production` ;
- `config/test.json` : utilisé par Jest (limitation de débit désactivée) ;
- `config/local.json` : **à créer localement** pour vos secrets. Il surcharge les fichiers précédents et est ignoré par Git ;
- variable d'environnement `NODE_CONFIG` : JSON qui surcharge tout (pratique avec Docker).

> 🔒 Ne committez jamais de vrais identifiants (URI MongoDB, mot de passe SMTP, client ID Google) dans les fichiers versionnés.

Exemple de `config/local.json` :

```json
{
  "db": { "uri": "mongodb://localhost:27017/auth" },
  "google": { "clientId": "<client-id>.apps.googleusercontent.com" },
  "email": {
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 465,
      "secure": true,
      "auth": { "user": "<adresse>", "pass": "<mot de passe d'application>" }
    }
  },
  "cors": { "origins": ["http://localhost:3000"] }
}
```

| Clé                                    | Défaut              | Description                                                                                                            |
| -------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `server.port`                          | `8080`              | Port HTTP.                                                                                                             |
| `server.trustProxy`                    | —                   | Valeur Express `trust proxy`. À définir derrière un reverse proxy pour que la limitation par IP voie la vraie adresse. |
| `db.uri`                               | —                   | URI de connexion MongoDB.                                                                                              |
| `google.clientId`                      | —                   | Client ID OAuth Google, pour vérifier les ID tokens de `/tenants/google-register`.                                     |
| `aud`                                  | `tenant2025`        | Audience des JWT tenants.                                                                                              |
| `tenant.scopes` / `consumer.scopes`    | voir `default.json` | Scopes attribués à l'inscription.                                                                                      |
| `email.smtp.*`                         | —                   | Paramètres du transport SMTP Nodemailer.                                                                               |
| `cors.origins`                         | `"*"`               | Origines autorisées (tableau). **À restreindre en production.**                                                        |
| `rateLimit.enabled`                    | `true`              | Active la limitation de débit sur les routes sensibles.                                                                |
| `rateLimit.windowMs` / `rateLimit.max` | `900000` / `20`     | Fenêtre (ms) et nombre maximal de requêtes par application et par IP.                                                  |
| `email.info.from`, `front.url`         | —                   | Présents dans la config mais pas encore utilisés par le code.                                                          |

### Réglages d'une application cliente

Définis à la création (`POST /config/apps/create`) :

| Champ                                     | Défaut       | Description                                                                       |
| ----------------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| `tokenExpiresIn`                          | `1h`         | Durée de l'access token des consumers.                                            |
| `refreshTokenExpiresIn`                   | `7d`         | Durée du refresh token.                                                           |
| `resetTokenExpiresIn`                     | `15m`        | Durée du code « mot de passe oublié ».                                            |
| `mfaVerificationMode`                     | `code`       | `code` (6 chiffres) ou `link` (lien vers `redirectUrl`).                          |
| `mfaExpiresIn`                            | `15m`        | Durée des demandes d'activation / désactivation MFA.                              |
| `requireEmailVerification`                | `false`      | Si `true`, un consumer ne peut pas se connecter avant d'avoir vérifié son e-mail. |
| `redirectUrl`, `resetPasswordUrl`         | obligatoires | URLs du front de l'application.                                                   |
| `supportEmail`, `logoUrl`, `primaryColor` | —            | Branding des e-mails.                                                             |

## Structure du projet

```
src/
├── index.ts                 # démarrage : connexion MongoDB puis écoute HTTP
├── app.ts                   # createApp() : middlewares (helmet, CORS) et routes, utilisé par les tests
├── config/db.ts             # connexion Mongoose
├── app/
│   ├── routes/              # routes + documentation Swagger (JSDoc)
│   └── swagger/swagger.ts   # définition OpenAPI et schémas des corps de requête
├── handlers/                # logique métier, style CQRS
│   ├── commands/            #   écritures (consumers/, tenants/, configurations/)
│   └── queries/             #   lectures
├── middleware/
│   ├── security/            # identifiants d'application, JWT, cloisonnement, limitation de débit
│   ├── validation/          # middleware de validation Zod
│   └── error/               # gestionnaire d'erreurs global
├── models/                  # schémas Mongoose, enums, sous-documents
├── services/
│   ├── email/               # templates, envoi, code de vérification d'e-mail
│   ├── security/            # codes à usage unique (hachage, expiration, tentatives)
│   ├── mfa/                 # vérification des demandes MFA
│   ├── token/               # émission, vérification, rotation et révocation des JWT
│   └── hashing/             # bcrypt
├── validation/              # schémas Zod
└── utils/                   # générateurs aléatoires (crypto)
tests/                       # tests d'intégration Jest + Supertest
```

## Authentification des requêtes

| Routes                                                                                 | En-têtes requis                                                              |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/tenants/register`, `login`, `loginByMFACode`, `google-register`, `refresh`, `logout` | aucun                                                                        |
| `/config/*` et `/tenants/:tenantId/app/...`                                            | `Authorization: Bearer <access_token tenant>` + `X-Tenant-Id: <tenantId>`    |
| `/consumers/*` (toutes les routes)                                                     | `x-app-id: <id de l'AppClient>` + `x-app-secret: <secretKey de l'AppClient>` |
| `/consumers/*` protégées (profil, mot de passe, MFA, `me`)                             | en plus : `Authorization: Bearer <access_token consumer>`                    |

**Cloisonnement** : un tenant ne peut agir que sur son propre `tenantId` et ses propres applications ; un consumer ne peut
agir que sur son propre compte (`:id`, `userId` et `email` doivent correspondre à son token). Sinon : `403`.

## Endpoints

### Tenants — `/tenants`

| Méthode | Route                                                 | Description                                                                             |
| ------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| POST    | `/tenants/register`                                   | Inscription (`firstName`, `lastName`, `email`, `password`, `confirmPassword`) → tokens. |
| POST    | `/tenants/login`                                      | Vérifie le mot de passe et envoie un code MFA par e-mail → `{ MFARequired: true }`.     |
| POST    | `/tenants/loginByMFACode`                             | Valide le code (`email`, `mfaCode`) → tokens.                                           |
| POST    | `/tenants/google-register`                            | Inscription / connexion avec un ID token Google (`token`) → tokens.                     |
| POST    | `/tenants/refresh`                                    | Échange un refresh token (`refreshToken`) contre une nouvelle paire.                    |
| POST    | `/tenants/logout`                                     | Révoque le refresh token (`refreshToken`, `allDevices?`).                               |
| GET     | `/tenants/:tenantId/app/:appId/consumers`             | Consumers d'une application du tenant.                                                  |
| GET     | `/tenants/:tenantId/app/:appId/consumers/:consumerId` | Détail d'un consumer.                                                                   |

### Applications clientes — `/config`

| Méthode | Route                                         | Description                                                                           |
| ------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| POST    | `/config/apps/create`                         | Crée une application (voir [réglages](#réglages-dune-application-cliente)) → `appId`. |
| PUT     | `/config/apps/update/:tenantId/:appId`        | Active / désactive l'application (`isActive`).                                        |
| GET     | `/config/apps/:tenantId`                      | Liste les applications du tenant.                                                     |
| GET     | `/config/apps/:tenantId/:appId`               | Détail d'une application, **y compris son `secretKey`**.                              |
| POST    | `/config/apps/:tenantId/:appId/rotate-secret` | Nouveau `secretKey` ; révoque les sessions des consumers.                             |

### Consumers — `/consumers/auth`

| Méthode | Route                      | Jeton consumer | Description                                                                                |
| ------- | -------------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| POST    | `/register`                | —              | Inscription ; envoie un code de vérification d'e-mail.                                     |
| POST    | `/verifyEmail`             | —              | Vérifie l'e-mail (`email`, `code`).                                                        |
| POST    | `/resendEmailVerification` | —              | Renvoie un code de vérification (`email`).                                                 |
| POST    | `/login`                   | —              | Connexion → tokens, ou `{ MFARequired: true }` si le MFA est actif.                        |
| POST    | `/loginByMFA`              | —              | Connexion avec le code MFA (`email`, `mfaCode`) → tokens.                                  |
| POST    | `/refresh`                 | —              | Échange un refresh token (`refreshToken`) contre une nouvelle paire.                       |
| POST    | `/logout`                  | —              | Révoque le refresh token (`refreshToken`, `allDevices?`).                                  |
| POST    | `/forgotPassword`          | —              | Envoie un code de réinitialisation par e-mail (`email`).                                   |
| POST    | `/verifyResetCode`         | —              | Échange le code (`email`, `resetCode`) contre un `resetToken`.                             |
| PUT     | `/resetPassword`           | —              | Nouveau mot de passe (`email`, `resetToken`, `password`, `confirmPassword`).               |
| PUT     | `/updatePassword/:id`      | ✔              | Change le mot de passe (`userId`, `currentPassword`, `password`, `confirmPassword`).       |
| PUT     | `/updateProfile/:id`       | ✔              | Modifie prénom / nom (`userId`, `newFirstName`, `newLastName`).                            |
| POST    | `/requestMFA`              | ✔              | Demande d'activation / désactivation (`email`, `requestType`: `activate` \| `deactivate`). |
| POST    | `/activateMFA`             | ✔              | Confirme l'activation (`userId`, `activationId` = code ou identifiant du lien).            |
| POST    | `/deactivateMFA`           | ✔              | Confirme la désactivation (`userId`, `deactivationId`).                                    |
| GET     | `/me/:id`                  | ✔              | Profil du consumer connecté.                                                               |

Le détail des corps de requête est disponible dans Swagger (`/api-docs`) et dans `src/validation/`.

## Parcours d'intégration

1. **Créer un compte tenant** : `POST /tenants/register` → `tenantId` et tokens.
2. **Se reconnecter plus tard** : `POST /tenants/login`, puis `POST /tenants/loginByMFACode` avec le code reçu par e-mail.
3. **Déclarer une application** : `POST /config/apps/create` (en-têtes `Authorization` + `X-Tenant-Id`) → `appId`.
4. **Récupérer le secret de l'application** : `GET /config/apps/:tenantId/:appId` → `secretKey`.
5. **Depuis le back-end de l'application**, appeler `/consumers/auth/*` avec `x-app-id: <appId>` et `x-app-secret: <secretKey>`.
6. **Gérer les sessions** : renouveler l'access token avec `/refresh` avant expiration, conserver **uniquement le dernier**
   refresh token reçu (chacun n'est utilisable qu'une fois), appeler `/logout` à la déconnexion.

Exemple : inscription puis connexion d'un consumer.

```bash
curl -X POST http://localhost:8080/consumers/auth/register \
  -H "Content-Type: application/json" \
  -H "x-app-id: $APP_ID" -H "x-app-secret: $APP_SECRET" \
  -d '{"firstName":"Bob","lastName":"Martin","email":"bob@example.com","password":"Password1!","confirmPassword":"Password1!"}'

curl -X POST http://localhost:8080/consumers/auth/login \
  -H "Content-Type: application/json" \
  -H "x-app-id: $APP_ID" -H "x-app-secret: $APP_SECRET" \
  -d '{"email":"bob@example.com","password":"Password1!"}'
# → { "access_token": "...", "refresh_token": "...", "user": { ... }, "isSuccess": true }
```

> Le `secretKey` de l'application donne accès à toutes les opérations sur ses consumers : il doit rester côté serveur,
> jamais dans un front web ou mobile. En cas de fuite, utiliser `rotate-secret`.

## Sécurité

- **Mots de passe** hachés avec bcrypt ; règles de complexité à l'inscription et au changement.
- **Codes à usage unique** (MFA, mot de passe oublié, vérification d'e-mail) : générés avec `crypto.randomInt`, stockés hachés,
  limités dans le temps et invalidés après **5 tentatives** échouées.
- **Réinitialisation du mot de passe** en deux temps : le code e-mail est échangé contre un `resetToken` à usage unique (15 min).
- **Refresh tokens** à usage unique : un token rejoué révoque toutes les sessions de l'utilisateur (détection de vol).
- **Pas d'énumération de comptes** : `forgotPassword` et `resendEmailVerification` répondent pareil que le compte existe ou non ;
  même message pour une application inconnue ou un mauvais secret (comparé en temps constant).
- **Limitation de débit** sur les routes de connexion, de codes et de mot de passe.
- **En-têtes HTTP** via `helmet` ; les erreurs 500 ne renvoient jamais le message interne.

## Format des réponses d'erreur

Erreurs métier (via le gestionnaire global) :

```json
{
  "error": {
    "status": 401,
    "code": "invalidCredentials",
    "message": "Invalid email or password",
    "isSuccess": false,
    "details": null
  }
}
```

- Erreurs de validation Zod : `status` 400, `message` `"Validation Error"`, `details` = `[{ "field": "...", "message": "..." }]`.
- Codes à usage unique : `invalidCode`, `expiredCode`, `noPendingCode` ; demandes MFA : `invalidMfaVerification` ;
  sessions : `invalidRefreshToken` ; e-mail : `emailNotVerified`.
- Erreurs internes : `status` 500, `code` `"internalError"`, message générique.
- Les middlewares de sécurité et la limitation de débit répondent directement avec `{ "message": "...", "isSuccess": false }`
  (400, 401, 403, 404 ou 429).

## Limites connues

- Le mode MFA `both` du modèle n'est pas géré : il se comporte comme `code`.
- Les access tokens sont sans état : après une déconnexion, un access token déjà émis reste valable jusqu'à son expiration
  (1 h par défaut). Les scopes des tokens ne sont pas encore vérifiés par les routes.
- Un seul code en attente par utilisateur : demander un code (mot de passe oublié, vérification d'e-mail, connexion MFA)
  remplace le code précédent.
- L'adresse d'expédition des e-mails est codée en dur (`no-reply@yourapp.com`) ; `email.info.from` n'est pas utilisé.
- Les middlewares de sécurité répondent avec leur propre format au lieu de passer par le gestionnaire d'erreurs global.
- L'image Docker n'a pas encore été testée en conditions réelles.
