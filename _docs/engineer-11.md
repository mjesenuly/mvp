# Issue 11 — Compose engineering handoff

Canonical issue: https://github.com/mjesenuly/mvp/issues/11 . This continues independently verified PostgreSQL issue 10; no new product functionality was introduced.

## Implementation

- `compose.yaml` runs the single built application image and PostgreSQL 16. The database has no host-published port, uses a persistent named volume, and gates app startup with `pg_isready`. The app checks its existing database-aware health endpoint, runs versioned migrations before listening, and retains the PostgreSQL single-writer protection.
- Local application port binds to loopback by default. Explicit local HTTP mode permits browser session cookies; documentation requires production mode and HTTPS for hosting. Restart and shutdown grace periods are configured.
- `.env.compose.example` contains private placeholders and URL-safe database password guidance. `.env.test` contains fictional disposable CI credentials only. Ephemeral integration session state and evidence folders are ignored by Git and Docker context.
- `scripts/integration.mjs` exercises an already-running external HTTP server: compiled frontend/assets/API 404, PostgreSQL health by default, customer/workshop/admin sessions, approval, ownership and private photos, structured offers, repeated/concurrent acceptance, immutable terms, revision approval and completion. The restart phase checks complete request/offer state, accepted terms, photos/history, approvals and sessions.
- The new Compose Actions workflow validates configuration, actually builds and starts app+database, runs external integration, stops/restarts both services without deleting their volume, verifies persistence, uploads safe runtime evidence and removes only its uniquely named disposable CI stack/volume. Cookies and credentials are not included in uploaded evidence.

## Actual local verification

| Check | Result |
| --- | --- |
| `npm run build` | PASS, TypeScript and Vite |
| `npm test` | PASS, 14 tests |
| `npm run test:api` | PASS, 4 tests |
| `npm run test:storage` | PASS, 4 tests |
| `npm run test:parity` | PASS, 4 tests |
| `npm run test:runtime` | PASS, 1 test |
| `npm run check:contract` | PASS, 19 operations including PostgreSQL readiness/error contract |
| `node --check scripts/integration.mjs` | PASS |
| PyYAML parsing of Compose/workflow files | PASS syntax check only |
| External integration script against a real local built HTTP server with temporary SQLite | Journey and full process-restart phases PASS; explicitly not PostgreSQL/Compose evidence |
| `git diff --check` | PASS |

There is no Docker executable/daemon or PostgreSQL server in the local workspace. Actual Compose configuration resolution, image execution, real PostgreSQL integration and container restart persistence remain pending the new GitHub Actions run. A YAML parser is not `docker compose config`. No workflow success, independent QA PASS or issue closure is claimed in this engineering handoff.
