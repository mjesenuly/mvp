# Run the complete RepairLens stack

Canonical issue: https://github.com/mjesenuly/mvp/issues/11 . Requires Docker Engine/Desktop with Compose v2. The single application image contains the static frontend and Express backend; `db` is PostgreSQL 16 with a named persistent volume and no published database port.

## First local startup

Open a terminal **inside the cloned repository folder**, where `compose.yaml` exists. Copy the configuration template:

CMD:

```bat
copy .env.compose.example .env
```

PowerShell:

```powershell
Copy-Item .env.compose.example .env
```

macOS/Linux:

```sh
cp .env.compose.example .env
```

Edit `.env` privately. Replace `POSTGRES_PASSWORD` with a long URL-safe random value (letters, digits, `_` and `-`), choose your admin email and a separate admin password of at least 10 characters. The password restriction avoids unescaped reserved characters in the assembled PostgreSQL URL. To generate a database password with Node:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Do not publish `.env` or generated passwords. Start everything with:

```sh
docker compose up --build
```

Open http://localhost:3000 on the computer running Docker. For background operation use `docker compose up --build --detach --wait`. The application listens only on the host loopback interface by default. Sign in with your private seeded admin, register customer/workshop accounts, and approve the workshop. Existing initialized databases retain their existing admin credentials; changing the environment does not reset them.

PostgreSQL readiness gates application startup. Application startup runs versioned TypeORM migrations before serving traffic and acquires the existing single-writer advisory lock. Never scale the application service beyond one instance or start another standalone application against this database. See [PostgreSQL migration and limitations](postgresql.md).

## HTTP versus production HTTPS

The base Compose configuration deliberately uses `NODE_ENV=development` for local HTTP so session cookies work in a browser. This does not run Vite or a development frontend server; it still serves the built static assets. Hosted deployments must use HTTPS, `NODE_ENV=production` and an exact public `APP_ORIGIN`, behind the deployment-specific proxy/ingress. Do not expose the local HTTP configuration as a production setup.

## Shutdown and persistence

```sh
docker compose stop
docker compose up --detach --wait
```

Stopping and restarting retains the PostgreSQL volume. `docker compose down` removes containers/network but retains the named volume. Neither ordinary operation requires deleting data. The application gets 20 seconds to drain HTTP connections and close its advisory-lock session; PostgreSQL gets 30 seconds.

**Do not use `down --volumes` on your real local or hosted stack:** it deletes its database. The CI workflow uses that command only for its uniquely named, explicitly disposable test project. Changing the Compose project name creates a different volume; keep the same name/folder for your real data.

## External integration verification

The script talks through HTTP to an **already-running built application**. It does not create an in-process server or mock repositories. With your private admin credentials available in the shell, run:

CMD:

```bat
set ADMIN_EMAIL=YOUR_ADMIN_EMAIL
set ADMIN_PASSWORD=YOUR_PRIVATE_ADMIN_PASSWORD
npm run test:integration
docker compose stop app db
docker compose up --detach --wait
npm run test:integration:restart
```

PowerShell:

```powershell
$env:ADMIN_EMAIL="YOUR_ADMIN_EMAIL"
$env:ADMIN_PASSWORD="YOUR_PRIVATE_ADMIN_PASSWORD"
npm run test:integration
docker compose stop app db
docker compose up --detach --wait
npm run test:integration:restart
```

Only run this test journey against a disposable test stack: it creates fictional accounts and repair records. It verifies built HTML/assets/API 404, real PostgreSQL health, separate customer/workshop/admin sessions, approval, ownership/photo protection, concurrent acceptance, immutable terms, quote revision and completion. The restart phase verifies saved sessions, approval, request/offer state, photos, accepted terms and history. It stores private ephemeral session state in ignored `.integration-state.json` with owner-only file permissions; delete that file after testing. Configure `BASE_URL` and `INTEGRATION_STATE_FILE` if necessary. These are HTTP integration tests, not Playwright browser tests.

The dedicated **RepairLens Compose integration** GitHub Actions workflow uses `.env.test` with fictional test-only credentials, a unique project name per run, and a disposable PostgreSQL volume. It validates configuration, builds/starts both services, runs the journey, stops and restarts **both** services without deleting their volume, verifies persistence, uploads safe logs and removes only its test stack/volume. A workflow file alone is not evidence of successful execution; consult the real Actions run and independent QA report.
