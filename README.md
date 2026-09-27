# Auth API — service d'authentification multi-applications

API d'authentification réutilisable (Node.js + TypeScript + Express + MongoDB), pensée comme un petit « Auth0 maison » :
un **tenant** (le développeur ou l'entreprise) crée un compte, déclare une ou plusieurs **applications clientes**, et chaque application
délègue à l'API l'inscription, la connexion, la gestion du mot de passe et le MFA de ses propres utilisateurs (**consumers**).

> ⚠️ Projet en cours de développement. Voir [Limites connues](#limites-connues) avant toute mise en production.

---

## Sommaire

- [Concepts](#concepts)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration](#configuration)
- [Structure du projet](#structure-du-projet)
- [Authentification des requêtes](#authentification-des-requêtes)
- [Endpoints](#endpoints)
- [Parcours d'intégration](#parcours-dintégration)
- [Format des réponses d'erreur](#format-des-réponses-derreur)
- [Limites connues](#limites-connues)

---

## Concepts

```
Tenant (propriétaire)                 ── s'authentifie sur /tenants/*
  └── AppClient (application cliente) ── gérée via /config/apps/*
        └── Consumer (utilisateur final) ── s'authentifie sur /consumers/*
```

| Entité | Rôle | Collection MongoDB |
|---|---|---|
| **Tenant** | Compte propriétaire. Possède un `secretKey` qui sert à signer ses propres JWT. | `tenants` |
| **AppClient** | Application enregistrée par un tenant. Possède un `id` (utilisé comme `x-app-id`) et un `secretKey` (utilisé comme `x-app-secret`), ainsi que ses réglages : durées de validité des tokens, URLs de redirection, mode MFA, branding des e-mails. | `appclients` |
| **Consumer** | Utilisateur final d'une application cliente. Unique par couple `(clientId, email)`. | `consumers` |
| **MFARequest** | Demande d'activation / désactivation du MFA d'un consumer (code ou lien envoyé par e-mail). | `mfarequests` |

**Isolation des tokens** : chaque JWT est signé avec une clé dérivée (`sha256(secretKey + "_access" | "_refresh")`) du secret
du tenant ou de l'application. Un token émis pour une application n'est donc pas valide pour une autre.

## Fonctionnalités

**Tenants**
- Inscription par e-mail / mot de passe, ou via Google (ID token Google).
- Connexion en deux étapes : mot de passe, puis code à 6 chiffres envoyé par e-mail.
- Gestion des applications clientes (création, activation / désactivation, consultation).
- Consultation des consumers d'une application.

**Consumers** (appels signés par les identifiants de l'application)
- Inscription, connexion (JWT access + refresh).
- Mot de passe oublié → code par e-mail → vérification → réinitialisation.
- Modification du mot de passe et du profil.
- MFA par e-mail : demande d'activation / désactivation (par code ou par lien), puis connexion par code.

**Transverse**
- Validation des corps de requête avec **Zod**.
- E-mails HTML (en français) via **Nodemailer / SMTP**, personnalisés avec le nom, la couleur et le logo de l'application.
- Documentation **Swagger** générée depuis les commentaires JSDoc des routes.

## Stack technique

- Node.js, TypeScript (exécuté via `ts-node`)
- Express 4
- MongoDB + Mongoose 8
- `jsonwebtoken`, `bcrypt`, `zod`, `nodemailer`, `google-auth-library`
- `config` (fichiers JSON par environnement)
- `swagger-jsdoc` + `swagger-ui-express`

## Démarrage rapide

Prérequis : Node.js 18+, une base MongoDB (locale ou Atlas), un compte SMTP (Gmail avec mot de passe d'application, par exemple).

```bash
npm install
# renseigner la configuration (voir ci-dessous) dans config/local.json
npm start
```

- API : `http://localhost:8080`
- Swagger UI : `http://localhost:8080/api-docs`

## Configuration

La configuration est gérée par le paquet [`config`](https://github.com/node-config/node-config) :

- `config/default.json` : valeurs par défaut (sans secrets) ;
- `config/production.json` : chargé quand `NODE_ENV=production` ;
- `config/local.json` : **à créer localement** pour vos secrets. Il surcharge les fichiers précédents et est ignoré par Git.

> 🔒 Ne committez jamais de vrais identifiants (URI MongoDB, mot de passe SMTP, client ID Google) dans `default.json` ou `production.json`.

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
  }
}
```

| Clé | Description |
|---|---|
| `server.port` | Port HTTP (défaut `8080`). |
| `db.uri` | URI de connexion MongoDB. |
| `google.clientId` | Client ID OAuth Google, utilisé pour vérifier les ID tokens de `/tenants/google-register`. |
| `aud` | Audience des JWT tenants (`tenant2025`). |
| `tenant.scopes` | Scopes attribués aux tenants à l'inscription (`consumer:*`, `app:*`). |
| `consumer.scopes` | Scopes attribués aux consumers à l'inscription. |
| `email.smtp.*` | Paramètres du transport SMTP Nodemailer. |
| `email.info.from` | Nom d'expéditeur (actuellement non utilisé par le code). |
| `front.url` | URL du front (actuellement non utilisée par le code). |

## Structure du projet

```
src/
├── index.ts                 # point d'entrée : Express, middlewares, montage des routes
├── config/db.ts             # connexion Mongoose
├── app/
│   ├── routes/              # définition des routes + documentation Swagger (JSDoc)
│   └── swagger/swagger.ts   # définition OpenAPI et schémas des corps de requête
├── handlers/                # logique métier, style CQRS
│   ├── commands/            #   écritures (consumers/, tenants/, configurations/)
│   └── queries/             #   lectures
├── middleware/
│   ├── security/            # vérification x-app-id/x-app-secret et des JWT
│   ├── validation/          # middleware de validation Zod
│   └── error/               # gestionnaire d'erreurs global
├── models/                  # schémas Mongoose, enums, sous-documents
├── services/                # e-mail (templates + envoi), hash bcrypt, tokens JWT
├── validation/              # schémas Zod
└── utils/
```

## Authentification des requêtes

| Préfixe | En-têtes requis |
|---|---|
| `/tenants/register`, `/tenants/login`, `/tenants/loginByMFACode`, `/tenants/google-register` | aucun |
| `/config/*` et consultation des consumers par un tenant | `Authorization: Bearer <access_token tenant>` + `X-Tenant-Id: <tenantId>` |
| `/consumers/*` (toutes les routes) | `x-app-id: <id de l'AppClient>` + `x-app-secret: <secretKey de l'AppClient>` |
| `/consumers/*` protégées (profil, mot de passe, MFA, `me`) | en plus : `Authorization: Bearer <access_token consumer>` |

## Endpoints

### Tenants — `/tenants`

| Méthode | Route | Description |
|---|---|---|
| POST | `/tenants/register` | Inscription (`firstName`, `lastName`, `email`, `password`, `confirmPassword`, `role`). |
| POST | `/tenants/login` | Vérifie le mot de passe et envoie un code MFA par e-mail. |
| POST | `/tenants/loginByMFACode` | Valide le code (`email`, `mfaCode`) et retourne les tokens. |
| POST | `/tenants/google-register` | Inscription / connexion avec un ID token Google (`token`). |
| GET | `/tenants/:tenantId/app/:appId/consumers/:consumerId` | Détail d'un consumer (tenant authentifié). |

### Applications clientes — `/config`

| Méthode | Route | Description |
|---|---|---|
| POST | `/config/apps/create` | Crée une application (`tenantId`, `name`, `tokenExpiresIn`, `resetTokenExpiresIn`, `mfaExpiresIn`, `redirectUrl`, `resetPasswordUrl`, `supportEmail`, `logoUrl`, `primaryColor`…). Retourne `appId`. |
| PUT | `/config/apps/update/:tenantId/:appId` | Active / désactive l'application (`isActive`). |
| GET | `/config/apps/:tenantId` | Liste les applications du tenant. |
| GET | `/config/apps/:tenantId/:appId` | Détail d'une application, **y compris son `secretKey`**. |

### Consumers — `/consumers/auth`

| Méthode | Route | Jeton consumer | Description |
|---|---|---|---|
| POST | `/register` | — | Inscription. |
| POST | `/login` | — | Connexion. Si le MFA est actif, un code est envoyé par e-mail. |
| POST | `/loginByMFA` | — | Connexion avec le code MFA (`email`, `mfaCode`). |
| POST | `/forgotPassword` | — | Envoie un code de réinitialisation par e-mail. |
| POST | `/verifyResetCode` | — | Vérifie le code (`email`, `resetCode`). |
| PUT | `/resetPassword` | — | Définit le nouveau mot de passe. |
| PUT | `/updatePassword/:id` | ✔ | Change le mot de passe (`currentPassword`, `password`, `confirmPassword`). |
| PUT | `/updateProfile/:id` | ✔ | Modifie prénom / nom. |
| POST | `/requestMFA` | ✔ | Demande d'activation / désactivation du MFA (`email`, `requestType`: `activate` \| `deactivate`). |
| POST | `/activateMFA` | ✔ | Confirme l'activation (`userId`, `activationId`). |
| POST | `/deactivateMFA` | ✔ | Confirme la désactivation (`userId`, `deactivationId`). |
| GET | `/me/:id` | ✔ | Détail du consumer connecté. |

Le détail des corps de requête est disponible dans Swagger (`/api-docs`) et dans `src/validation/`.

## Parcours d'intégration

1. **Créer un compte tenant** : `POST /tenants/register`.
2. **Se connecter** : `POST /tenants/login`, puis `POST /tenants/loginByMFACode` avec le code reçu par e-mail
   → `access_token` tenant + `tenantId`.
3. **Déclarer une application** : `POST /config/apps/create` (en-têtes `Authorization` + `X-Tenant-Id`) → `appId`.
4. **Récupérer le secret de l'application** : `GET /config/apps/:tenantId/:appId` → `secretKey`.
5. **Depuis le back-end de l'application**, appeler `/consumers/auth/*` avec `x-app-id: <appId>` et `x-app-secret: <secretKey>`.

> Le `secretKey` de l'application donne accès à toutes les opérations sur ses consumers : il doit rester côté serveur,
> jamais dans un front web ou mobile.

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

Erreurs de validation Zod : `status` 400, `message` `"Validation Error"` et `details` sous la forme `[{ "field": "...", "message": "..." }]`.

Les middlewares de sécurité répondent directement avec `{ "message": "...", "isSuccess": false }` (400, 401 ou 403).

## Limites connues

Points relevés à la lecture du code, à traiter dans des tickets dédiés :

**Bugs fonctionnels**
- `POST /consumers/auth/register` : le handler lit `appClient.appId`, champ absent du modèle `AppClient` (qui expose `id`).
  Le `clientId` du consumer est donc `undefined` et l'inscription échoue.
- `POST /consumers/auth/login` : la recherche se fait par e-mail seul, sans filtrer sur l'application. Quand le MFA est actif,
  le handler envoie deux réponses (`ERR_HTTP_HEADERS_SENT`).
- Route `GET /tenants/tenants/{tenantId}/consumers` : syntaxe `{tenantId}` au lieu de `:tenantId`, et le handler attend un paramètre `appId`.
  Elle est inutilisable en l'état.
- `GET /tenants/:tenantId/app/:appId/consumers/:consumerId` : le handler lit `req.params.id` au lieu de `consumerId`.
- `POST /config/apps/create` : `mfaSettings` est construit avec une forme qui ne correspond pas au schéma. Les valeurs par défaut
  (`code`, 15 min) s'appliquent toujours.
- MFA en mode `link` : l'activation cherche `verification.link` alors que le champ stocké est `verification.linkId`.
- Un tenant inscrit via Google a `isMFAActivated: false` et ne peut pas utiliser `/tenants/login`.

**Sécurité**
- `/tenants/login` renvoie déjà les tokens **avant** la validation du code MFA, ce qui rend le second facteur contournable.
- `/tenants/register` et `/tenants/login` renvoient le `secretKey` du tenant, qui sert à signer ses JWT.
- `/consumers/auth/forgotPassword` renvoie le hash du code de réinitialisation.
- Les codes à 6 chiffres sont générés avec `Math.random()` (non cryptographique). Les codes MFA des `MFARequest` sont stockés en clair.
- Aucune limitation de débit (rate limiting) sur les routes de connexion et de codes.
- L'adresse d'expédition des e-mails est codée en dur (`no-reply@yourapp.com`).

**Outillage**
- Pas de script `build`, `lint` ni `test`. `.eslintrc.js` référence des paquets ESLint / Prettier non installés.
- Certains chemins documentés dans Swagger sont faux (`/auth/verifyResetPasswordCode`, `/auth/resetPassword` sans préfixe `/consumers`).
