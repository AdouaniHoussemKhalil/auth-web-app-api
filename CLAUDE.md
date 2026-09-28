# CLAUDE.md

Guide pour les assistants de code travaillant sur ce dépôt. La présentation fonctionnelle complète est dans [README.md](README.md).

## Le projet en bref

API d'authentification multi-applications (Express + TypeScript + Mongoose) :
**Tenant** (propriétaire) → **AppClient** (application déclarée par le tenant) → **Consumer** (utilisateur final de l'application).

- Les tenants s'authentifient sur `/tenants/*` et gèrent leurs applications sur `/config/*`.
- Les applications appellent `/consumers/*` avec les en-têtes `x-app-id` et `x-app-secret`.
- Chaque JWT est signé avec `sha256(secretKey + "_access" | "_refresh")`, où `secretKey` est celui du tenant ou de l'AppClient.
  Les refresh tokens portent un `jti` enregistré dans la collection `refreshtokens` (rotation et révocation) :
  voir `src/services/token/tokenService.ts`.

## Commandes

```bash
npm install
npm run dev             # serveur avec rechargement, port 8080
npm run typecheck       # tsc --noEmit (src + tests)
npm run lint            # ESLint + Prettier (lint:fix pour corriger)
npm test                # Jest + Supertest, MongoDB en mémoire
npm run build           # compile vers dist/ (tsconfig.build.json)
```

Swagger : `http://localhost:8080/api-docs`.

**Avant chaque commit** : `npm run typecheck && npm run lint && npm test`. La CI (`.github/workflows/ci.yml`) exécute
les mêmes étapes plus `build` sur chaque PR vers `develop` et `main`.

## Tests

- Tests d'intégration dans `tests/`, un fichier par domaine (`tenants`, `configurations`, `consumers`, `consumerFlows`,
  `security`, `sessions`, `swagger`).
- `tests/helpers/globalSetup.ts` démarre un MongoDB en mémoire ; chaque fichier utilise sa propre base (`helpers/db.ts`).
- L'envoi d'e-mails est simulé : `jest.mock("../src/services/email/sendMails")` en tête de fichier, puis
  `lastEmailVariable(templates.x.id)` pour récupérer le code ou le lien envoyé.
- Helpers de parcours dans `tests/helpers/fixtures.ts` : `registerTenant`, `createAppClient`, `registerConsumer`,
  `tenantHeaders`, `appHeaders`, `consumerHeaders`.
- `config/test.json` désactive la limitation de débit.
- `tests/swagger.test.ts` compte les routes documentées : **à mettre à jour quand on ajoute une route**.

## Configuration

- Paquet `config` : `config/default.json`, `config/production.json` (`NODE_ENV=production`), `config/test.json` (Jest),
  `config/local.json` pour les secrets locaux (ignoré par Git), et la variable `NODE_CONFIG` (JSON) pour Docker.
- Lire la configuration avec `config.get("clé.imbriquée")`. Pour une clé optionnelle, utiliser `config.has()` avec une valeur
  par défaut dans le code (voir `app.ts`, `rateLimiter.ts`) plutôt que de modifier `default.json`.
- **Ne jamais écrire de secrets** (URI MongoDB, mot de passe SMTP, client ID Google) dans les fichiers de config versionnés.

## Architecture et conventions

```
src/app.ts             createApp() : helmet, CORS, routes, errorHandler (sans listen, utilisé par les tests)
src/index.ts           connexion MongoDB puis listen
src/app/routes/        routes Express + blocs JSDoc @swagger
src/app/swagger/       définition OpenAPI et schémas (components.schemas)
src/handlers/commands/ écritures, un fichier = un handler (export default)
src/handlers/queries/  lectures
src/middleware/        security/ (app client, JWT, cloisonnement, rate limit), validation/ (Zod), error/
src/models/            modèles Mongoose ; Tenant et Consumer étendent UserSchema (User.ts)
src/services/          email/, security/ (codes à usage unique), mfa/, token/, hashing/
src/validation/        schémas Zod, un fichier par requête
```

Pour ajouter un endpoint :

1. Créer le schéma Zod dans `src/validation/<domaine>/<action>Schema.ts`.
2. Créer le handler dans `src/handlers/commands|queries/<domaine>/<action>Handler.ts` : signature `(req, res, next)`, `export default`.
3. Déclarer la route dans `src/app/routes/<domaine>Routes.ts` : `authRateLimiter` si la route est sensible (connexion, code,
   mot de passe), `validate(schema)`, le middleware de sécurité adapté, puis `asyncHandler(handler)`.
4. Documenter la route (bloc `@swagger`), ajouter le schéma de corps dans `swagger.ts` et mettre à jour `tests/swagger.test.ts`.
5. Ajouter les tests d'intégration.

Conventions :

- Erreurs métier : `const error = new Error("Message") as CustomError; error.status = 4xx; error.code = "camelCaseCode"; throw error;`,
  puis `next(error)` dans le `catch`. Le format final est produit par `middleware/error/errorHandler.ts`, qui masque les erreurs 500.
- Réponses de succès : JSON avec `isSuccess: true` (plus `message`, `data`, `user`, `access_token`, `refresh_token` selon le cas).
- Identifiants métier : champ `id` (UUID via `crypto.randomUUID()`), distinct du `_id` Mongo. Requêter par `{ id }`.
- **Toute recherche de consumer filtre sur l'application** : `Consumer.findOne({ ..., clientId: appClient.id })`.
- `consumerActionsAuthToken` place l'AppClient dans `(req as any).appClient` ; `consumerProtectedActionsAuthToken` place le JWT
  décodé dans `(req as any).user` et refuse (403) si `:id`, `body.userId` ou `body.email` ne sont pas ceux du token.
  `tenantProtectedActionsAuthToken` fait de même avec `:tenantId`, `body.tenantId` et vérifie que `:appId` appartient au tenant.
- Codes à usage unique : toujours passer par `src/services/security/oneTimeCode.ts` (`setOneTimeCode` / `consumeOneTimeCode`),
  qui gère hachage, expiration et limite de tentatives. Un seul code en attente par utilisateur (`secondaryUserAccess`).
- Aléatoire : `src/utils/random.ts` (basé sur `crypto`) ; jamais `Math.random()`.
- Tokens : `generateConsumerToken` / `generateTenantToken` prennent l'identifiant du sujet pour enregistrer le refresh token ;
  le contenu du JWT est construit par `src/services/token/payloads.ts`. Ne jamais mettre de secret dans un payload JWT.
- Ne pas révéler l'existence d'un compte : mêmes réponses pour un e-mail inconnu (`forgotPassword`, `resendEmailVerification`,
  codes invalides).
- E-mails : ajouter un template dans `src/services/email/models/Template.ts` (textes en français) et l'envoyer avec
  `sendTemplateEmail(templates.x.id, { recipient, appClientBranding, variable })`.
- Commentaires Swagger, commentaires de code et textes des e-mails en français ; code, messages d'erreur API et `error.code` en anglais.

## Pièges connus

- **Lockfile sous Windows** : `npm install <paquet>` retire du `package-lock.json` des dépendances optionnelles Linux
  (`@emnapi/*`), ce qui fait échouer `npm ci` en CI. Après tout ajout de dépendance, régénérer le lockfile depuis zéro
  (`rm -rf node_modules package-lock.json && npm install`) et vérifier que `"node_modules/@emnapi/core"` y figure.
- **mongodb-memory-server** télécharge le binaire MongoDB (≈ 80 Mo) au premier lancement ; le premier `npm test` peut être long.
  Définir `MONGOMS_DISABLE_POSTINSTALL=1` pour éviter le téléchargement au `npm install` si le binaire est déjà en cache.
- **Chemins et globs** : sous Windows, `path.join` produit des antislashs que les globs ne comprennent pas (voir `swagger.ts`).
- Les middlewares de sécurité répondent avec leur propre format (`{ message, isSuccess }`) au lieu de passer par `errorHandler`.
- La section « Limites connues » du README liste les autres limites.

## Workflow Git

- Branches `feature/<sujet>` ou `fix/<sujet>` créées depuis `develop`. Les PR ciblent `develop`, jamais directement `main` ou `master`.
- Commits au format Conventional Commits, description en français (`fix(consumers): ...`), avec `Refs #N` / `Closes #N`.
- Ne jamais committer `config/local.json`, `.env*`, `node_modules/` ni `dist/`.
