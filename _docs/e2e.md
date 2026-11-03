# Playwright browser verification

Canonical feature issues are individually labelled `e2e-test`; see [the coverage matrix](e2e-coverage.md). Tests use real browser interaction with the built frontend, real API and PostgreSQL Compose stack. The suite never substitutes mocked backend responses. Prerequisite fixtures may call the actual API; the selected feature's action is performed through the browser.

## Run against disposable local Compose

Use a dedicated test project, not your real database. `.env.test` contains fictional test-only credentials. In a terminal inside the repository:

```sh
npm ci
npx playwright install chromium
docker compose --project-name repairlens-e2e-local --env-file .env.test up --build --detach --wait
npm run test:e2e
```

The default browser URL is `http://localhost:3000`, matching `.env.test`'s `APP_ORIGIN`. `E2E_BASE_URL` can override it, but the application origin must match. Select only one feature during engineering/QA, for example:

```sh
npm run test:e2e -- e2e/16-registration.spec.ts
npm run test:e2e:list
```

The auto fixture requires `/api/health` to report PostgreSQL before every test. Test accounts have unique fictional identifiers so runs do not need a public database-reset endpoint. Browser contexts do not share authentication. HTTP helpers obtain real CSRF tokens and share only their own context's cookies.

After testing, ordinary `docker compose --project-name repairlens-e2e-local --env-file .env.test down` retains that test database. If you intentionally discard this **disposable test project's** records, add `--volumes`. Never delete the volume of your real local/hosted stack.

## Results and CI

`RepairLens Playwright E2E` installs Chromium on GitHub Actions, builds/starts the Compose application and database, and runs the browser suite with zero retries. It uploads HTML/JUnit reports and failure screenshots/traces plus runtime logs. Open the report locally with `npx playwright show-report`. These artifacts contain only fictional disposable test data; do not point this test workflow at a production database.

A workflow file is not proof of successful execution. Record the actual run, tested commit and independent QA result for each feature before closing its issue. The test runner exits unsuccessfully when the application/database is absent or the health storage mode is wrong.

## Explicit local diagnostic override

The restricted agent workspace has no Docker/PostgreSQL server. Local debugging can explicitly set `E2E_EXPECT_STORAGE=sqlite` against a built local SQLite server. That is a real browser/HTTP diagnostic but **does not satisfy PostgreSQL/Compose verification**. CI always requires PostgreSQL and rejects that override.

`npm run build` followed by `npm run test:e2e:diagnostic -- e2e/16-registration.spec.ts` starts a built server against a temporary SQLite database on a free port, runs the selected browser tests, and stops/removes only that temporary diagnostic data. The command refuses CI and prints its evidence limitation. It is useful in execution environments where separate terminal calls cannot share a running local server. It requires an installed normal Playwright browser, or the explicit local executable override below.

When a container cannot install the normal browser binary, local-only `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` and JSON-array `PLAYWRIGHT_CHROMIUM_ARGS` select an externally supplied Chromium executable. These are rejected in CI; the repository does not bundle an alternative browser or add its binary package to production dependencies.
