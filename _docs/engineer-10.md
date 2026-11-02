# Issue #10 — PostgreSQL engineering handoff

Canonical issue: https://github.com/mjesenuly/mvp/issues/10

## Implemented

- Added the production `pg` driver, PostgreSQL TypeORM repository and explicit environment-driven storage factory. Existing SQLite entities and the versioned initial migration are shared; `synchronize` remains false.
- Acquired and retained a dedicated PostgreSQL advisory-lock session before migrations/state loading. This deliberately rejects additional application or maintenance writers for the same database/schema. It protects the existing cached whole-state domain rather than falsely claiming horizontal scaling.
- Added live readiness checks to API access and `/api/health`; pinned-connection failure fails closed. Migrations finish before the server listens. Existing successful health/API response shapes remain unchanged.
- Added safe offline SQLite backup/transfer tooling, occupied-target refusal, relation and money validation, transactional writes, canonical semantic comparison, row counts and unchanged source-byte checks. The original SQLite file is never opened by the writable ORM; only a temporary copy is opened. Backups are private.
- Added real PostgreSQL tests with disposable isolated schemas: migrations, singleton exclusion, unique-constraint rollback, restart persistence, exact SQLite transfer/refusal, HTTP account/session/request restart and failed-connection readiness. Existing API tests can run against PostgreSQL through the same harness, including concurrency and permissions.
- Added `.github/workflows/postgres.yml` with a real PostgreSQL 16 service and the complete relevant command sequence. See `_docs/postgresql.md` for operating and rollback instructions.

## Actual local results

Node 24.22.1, current workspace:

| Command | Result |
| --- | --- |
| `npm install pg` | Installed 14 packages; production dependency/lockfile updated |
| `npm run build` | TypeScript and Vite PASS |
| `npm test` | 14/14 PASS |
| `npm run test:api` | 4/4 PASS |
| `npm run test:storage` | 4/4 PASS |
| `npm run test:parity` | 4/4 PASS |
| `npm run test:runtime` | 1/1 PASS |
| `npm run check:contract` | 19 operations, PASS |
| Explicit unsupported storage/missing PostgreSQL URL assertions | PASS |
| `git diff --check` | PASS |
| `npm run test:postgres` | Correctly FAILED preflight: `TEST_DATABASE_URL` unavailable |

## Pending evidence

This workspace has neither a PostgreSQL server nor Docker. Real PostgreSQL tests have **not yet run here**. Publication must be followed by actual execution of the PostgreSQL GitHub Actions workflow and independent QA before issue closure. The local regression passes are not PostgreSQL verification. No production data migration, cloud deployment, issue closure or remote success is claimed by this engineering handoff.

## QA repair — readiness contract

Independent QA identified that the original OpenAPI health enum omitted PostgreSQL and did not document the new 503 readiness responses. Updated `openapi.yml` to API version 1.1.0 with the three storage modes, distinct successful/unavailable health schemas, and `STORAGE_UNAVAILABLE` responses for every other API operation. Strengthened `scripts/check-contract.mjs` to check these response shapes, modes, status values and examples. Local `npm run check:contract` and `npm run build` passed. Three isolated mutation probes confirmed the checker rejects an omitted PostgreSQL mode, missing API 503 response and incorrect unavailable-health status. The probes used temporary document copies and did not alter the canonical contract.
