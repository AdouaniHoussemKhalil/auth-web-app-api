# CLAUDE.md

Guide pour les assistants de code travaillant sur ce dépôt. La présentation fonctionnelle complète est dans [README.md](README.md).

## Le projet en bref

API d'authentification multi-applications (Express + TypeScript + Mongoose) :
**Tenant** (propriétaire) → **AppClient** (application déclarée par le tenant) → **Consumer** (utilisateur final de l'application).

- Les tenants s'authentifient sur `/tenants/*` et gèrent leurs applications sur `/config/*`.
- Les applications appellent `/consumers/*` avec les en-têtes `x-app-id` et `x-app-secret`.
- Chaque JWT est signé avec `sha256(secretKey + "_access" | "_refresh")`, où `secretKey` est celui du tenant ou de l'AppClient
  (voir `src/services/token/tokenService.ts`).

## Commandes

```bash
npm install
npm start               # ts-node src/index.ts, port 8080 par défaut
npx tsc --noEmit        # vérification de types (il n'existe pas de script build/lint/test)
```

Swagger : `http://localhost:8080/api-docs`.

Il n'y a **aucun test automatisé**. Pour vérifier une modification, lancer au minimum `npx tsc --noEmit`.

## Configuration

- Paquet `config` : `config/default.json`, `config/production.json` (`NODE_ENV=production`), et `config/local.json`
  pour les secrets locaux (ignoré par Git).
- Lire la configuration avec `config.get("clé.imbriquée")`.
- **Ne jamais écrire de secrets** (URI MongoDB, mot de passe SMTP, client ID Google) dans les fichiers de config versionnés.

## Architecture et conventions

```
src/app/routes/        routes Express + blocs JSDoc @swagger
src/app/swagger/       définition OpenAPI et schémas (components.schemas)
src/handlers/commands/ écritures, un fichier = un handler (export default)
src/handlers/queries/  lectures
src/middleware/        security/ (app client, JWT tenant/consumer), validation/ (Zod), error/
src/models/            modèles Mongoose ; Tenant et Consumer étendent UserSchema (User.ts)
src/services/          email/ (templates HTML + Nodemailer), hashing/ (bcrypt), token/ (JWT)
src/validation/        schémas Zod, un fichier par requête
```

Pour ajouter un endpoint :
1. Créer le schéma Zod dans `src/validation/<domaine>/<action>Schema.ts`.
2. Créer le handler dans `src/handlers/commands|queries/<domaine>/<action>Handler.ts` : signature `(req, res, next)`, `export default`.
3. Déclarer la route dans `src/app/routes/<domaine>Routes.ts` : `validate(schema)`, le middleware de sécurité adapté, puis `asyncHandler(handler)`.
4. Documenter la route (bloc `@swagger`) et ajouter le schéma de corps dans `swagger.ts`.

Conventions observées :
- Erreurs métier : `const error = new Error("Message") as CustomError; error.status = 4xx; error.code = "camelCaseCode"; throw error;`,
  puis `next(error)` dans le `catch`. Le format final est produit par `middleware/error/errorHandler.ts`.
- Réponses de succès : JSON avec `isSuccess: true` (plus `message`, `data`, `user`, `access_token`, `refresh_token` selon le cas).
- Identifiants métier : champ `id` (UUID via `crypto.randomUUID()`), distinct du `_id` Mongo. Requêter par `{ id }`.
- Le middleware `consumerActionsAuthToken` place l'AppClient dans `(req as any).appClient` et `consumerProtectedActionsAuthToken`
  place le JWT décodé dans `(req as any).user`. Côté tenant, le JWT décodé est dans `(req as any).tenant`.
- Codes à usage unique (MFA, mot de passe oublié) : hashés avec bcrypt dans `user.secondaryUserAccess` (`code`, `expires`, `type`).
- E-mails : ajouter un template dans `src/services/email/models/Template.ts` (textes en français) et l'envoyer avec
  `sendTemplateEmail(templates.x.id, { recipient, appClientBranding, variable })`.
- Commentaires Swagger et textes des e-mails en français ; code, messages d'erreur API et `error.code` en anglais.

## Pièges connus

La section « Limites connues » du README liste les bugs repérés. Les plus susceptibles de surprendre :
- `registerUserHandler` utilise `appClient.appId`, qui n'existe pas (le bon champ est `appClient.id`).
- `loginUserHandler` peut envoyer deux réponses quand le MFA est actif (il manque un `return`).
- `tenantsRoutes` : une route utilise la syntaxe `{tenantId}` au lieu de `:tenantId`.
- Les middlewares de sécurité répondent avec leur propre format (`{ message, isSuccess }`) au lieu de passer par `errorHandler`.

## Workflow Git

- Branches `feature/<sujet>` ou `fix/<sujet>` créées depuis `develop`. Les PR ciblent `develop`, jamais directement `main` ou `master`.
- Commits au format Conventional Commits, description en français (`fix(consumers): ...`), avec `Refs #N` / `Closes #N`.
- Ne jamais committer `config/local.json`, `.env*`, `node_modules/` ni `dist/`.
