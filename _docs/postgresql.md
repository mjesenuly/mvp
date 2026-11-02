# PostgreSQL storage and SQLite data transfer

Deployment assignment issue: [#10](https://github.com/mjesenuly/mvp/issues/10).

## Architecture and limits

`STORAGE=postgres` selects the TypeORM PostgreSQL adapter; `DATABASE_URL` is required. `DATABASE_SCHEMA` defaults to `public`. Unknown storage names fail startup rather than silently falling back to an empty memory database. SQLite remains available for the earlier MVP and migration source.

The existing domain engine caches complete aggregates and serializes requests in one process. PostgreSQL does **not** make that engine safe to run on multiple replicas. Before migrations or state loading, the adapter takes a PostgreSQL session advisory lock scoped to the database and schema. Its dedicated QueryRunner connection keeps the lock for the application lifetime. A second application, migration or transfer process for that schema fails startup. This is a deliberately bounded single-writer deployment, not high availability. Run one application replica; stop it before maintenance. A later issue would need transactional, database-backed reads and writes to support horizontal scaling.

The versioned `InitialRepairLens1760950000000` migration is portable across the SQL.js SQLite and PostgreSQL drivers. Existing entities retain identifiers and JSON aggregate payloads. PostgreSQL transactions preserve whole-state writes, unique account emails and unique active workshop/request offers. `synchronize` stays disabled. Migrations finish before HTTP listening starts; `npm run migrate` provides an explicit maintenance command. Migration tooling holds the same writer lock, so it cannot race an active application.

Every API request checks the pinned writer connection before serving cached data. `/api/health` returns the existing `200 {status: "ok", storage: "postgres"}` response only while that connection is available; it returns 503 otherwise. A lost pinned connection fails closed and requires an application restart; the adapter never silently reconnects without its lock. Successful shutdown releases the advisory lock and closes the pool.

## Start against an existing PostgreSQL database

Create an empty database and a dedicated database user privately. Do not expose PostgreSQL directly to the internet. Copy `.env.example` to the ignored `.env`, replace the admin placeholders, select PostgreSQL, and use a URL-encoded database password in the connection URL. Never commit `.env`, database backups, or credentials.

PowerShell, from the folder containing `package.json`:

```powershell
$env:STORAGE="postgres"
$env:DATABASE_URL="postgresql://repairlens:YOUR_URL_ENCODED_PASSWORD@localhost:5432/repairlens"
$env:ADMIN_EMAIL="YOUR_ADMIN_EMAIL"
$env:ADMIN_PASSWORD="YOUR_ADMIN_PASSWORD_AT_LEAST_10_CHARACTERS"
npm ci
npm run build
npm run migrate
npm start
```

CMD:

```bat
set STORAGE=postgres
set DATABASE_URL=postgresql://repairlens:YOUR_URL_ENCODED_PASSWORD@localhost:5432/repairlens
set ADMIN_EMAIL=YOUR_ADMIN_EMAIL
set ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD_AT_LEAST_10_CHARACTERS
npm ci
npm run build
npm run migrate
npm start
```

Open `http://localhost:3000` on the machine running the application. Keep `NODE_ENV` unset for local HTTP. Production keeps `NODE_ENV=production`, requires HTTPS, and sets `APP_ORIGIN` to the exact public origin. The admin is seeded only when the application state is first initialized. Changing environment variables does not reset existing account passwords.

## Preserve an existing SQLite database

1. Stop the SQLite application and any PostgreSQL application using the target schema. Keep both offline during transfer. This procedure assumes the existing SQL.js SQLite file, not a live native SQLite WAL database.
2. Keep the original SQLite file. Set `DATABASE_URL` for a **new empty** PostgreSQL database/schema. The transfer refuses any occupied target, including an initialized empty application.
3. Run `npm ci`, then execute the transfer with the original file and a **new** backup filename. The backup file must not already exist:

   ```sh
   npm run migrate:data -- .data/repairlens.sqlite .data/repairlens-before-postgres.sqlite
   ```

4. The tool creates a private backup, opens only a temporary copy through the writable SQLite ORM, validates owner/workshop/session/selected-offer relationships, writes the complete state in a PostgreSQL transaction, then compares canonical payloads. It reports account, request, offer and session counts without printing private payloads. Money integers, null unknown charges, timestamps, history, passwords, sessions and photos remain exact JSON values. Source bytes must remain unchanged.
5. Review the counts and successful verification. Start the application with `STORAGE=postgres`, sign in using existing accounts, and verify the existing requests, offers, private photos and history. Keep the old database and backup privately until the migration is accepted.

Never seed demo data over existing records. There is no automatic overwrite or merge. On a transfer error, keep both applications offline and retain the source/backup. A transaction failure leaves the previous target state unchanged. If post-write verification fails, do not keep using the target or rerun into it: investigate and choose a new empty target after review. Rollback before accepting new PostgreSQL writes is to stop PostgreSQL application use and restart the earlier SQLite version against the unchanged original file. Writes made after cutover need a separate reconciled recovery plan; switching back would lose those newer changes.

## Real PostgreSQL verification

`npm run test:postgres` requires `TEST_DATABASE_URL` for a disposable real PostgreSQL database. It fails clearly if the variable is missing. It creates uniquely named test schemas and removes only those schemas in cleanup; it never defaults to the normal `DATABASE_URL` or application `public` schema.

The suite tests migrations, single-writer rejection, unique-constraint transaction rollback, close/reopen persistence, exact SQLite transfer, occupied-target refusal, account/session/request HTTP persistence and unavailable-database responses. It also reruns the existing four API scenarios on PostgreSQL, including competing acceptance, permissions, revisions, protected photos and the production frontend. The dedicated GitHub Actions workflow provisions PostgreSQL 16 and executes these checks. A checked-in workflow is not a claim that they passed; actual run links are recorded in QA evidence after execution.

## Sources

- [TypeORM data source options](https://typeorm.io/docs/data-source/data-source-options/)
- [PostgreSQL advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
- [Assignment deployment article](https://aishippingblog.com/p/deploy-a-full-stack-app-with-ai-coding)
