# Issue #9 — Containerisation engineering handoff

Canonical issue: https://github.com/mjesenuly/mvp/issues/9

## Implementation

- Added a Node 24 multi-stage Dockerfile. The build compiles Vite assets; the runtime serves them through the existing Express application, installs production dependencies only and runs as the non-root `node` user.
- Moved `tsx` into production dependencies because the existing runtime executes TypeScript with `node --import tsx`. Lockfile dependency versions were preserved.
- Added Docker context exclusions for local environments, databases, development dependencies, test files and evidence.
- Added an HTTP health check and documented persistent local volume setup, HTTPS production configuration and normal shutdown.
- Added SIGTERM/SIGINT handling that drains the HTTP listener, closes the storage adapter and exits successfully. A 15-second deadline prevents indefinite shutdown; documented Docker commands allow 20 seconds.
- Added a real subprocess test for static assets, frontend route refresh, JSON API 404 and graceful SIGTERM.
- Added a separate GitHub Actions workflow that actually builds/runs the image, checks non-root identity and health, verifies HTTP behaviour and graceful container shutdown, and uploads evidence.

## Executed local verification

All commands below completed successfully in the project directory on Node 24.22.1:

| Command | Result |
| --- | --- |
| `npm run build` | TypeScript and Vite build PASS |
| `npm run test:runtime` | 1/1 subprocess test PASS |
| `npm run test:api` | 4/4 HTTP API tests PASS |
| `npm test` | 14/14 domain, DOM, transport and HTTP-adapter tests PASS |
| `npm run test:storage` | 4/4 SQLite migration, persistence and parity tests PASS |
| `npm run test:parity` | 4/4 SQLite API tests PASS |
| `npm run check:contract` | 19 operations checked, PASS |

## Verification boundary

No Docker executable or daemon is available in this workspace. Local process tests are not Docker evidence. Actual image build/runtime verification must be observed in the new GitHub Actions workflow after publication. Independent QA and issue closure remain pending; this handoff does not claim them.
