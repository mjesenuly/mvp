# Issue 16 — Playwright registration and shared harness

Canonical issue: https://github.com/mjesenuly/mvp/issues/16 . Issue 11 was independently verified and closed before this implementation began.

## Implementation

- Added `@playwright/test`, `playwright.config.ts`, an actual browser workflow and test selection scripts.
- Added five separate registration scenarios in `e2e/16-registration.spec.ts`: customer registration, pending workshop registration, required/email/password validation, duplicate-email conflict, and public-admin-role denial.
- Successful registration and duplicate rejection go through the real visible form. Negative API assertions supplement browser checks. No backend responses or repositories are mocked.
- The shared fixture requires real PostgreSQL health by default. Every browser context retains its own HttpOnly cookie; the API helper fetches actual CSRF tokens for mutations.
- Configured zero retries, HTML/JUnit reports, retained failure traces/screenshots and safe disposable runtime evidence. CI installs normal Chromium, builds/starts Compose and PostgreSQL, and refuses local browser/storage overrides.
- Added the explicitly local-only `test:e2e:diagnostic` command, which launches a built HTTP server with temporary SQLite on an available port and removes only its own diagnostic data after shutdown. It refuses CI and prints its limitations.
- Added setup instructions and updated only issue 16's coverage row to describe actual implementation and local evidence. Other feature rows remain planned.

## Actual verification

| Check | Actual result |
| --- | --- |
| `npm run test:e2e:list` | Five registration scenarios discovered in one file |
| `npm run build` | TypeScript/Vite PASS |
| `npm test` | 14/14 existing frontend/domain/transport tests PASS |
| `npm run check:contract` | 19 operations, PostgreSQL readiness/error checks PASS |
| `git diff --check` | PASS |
| Real browser diagnostic, built HTTP app + temporary SQLite | Five scenarios PASS in 4.1 seconds after locator correction |
| `npm run test:e2e:diagnostic -- e2e/16-registration.spec.ts` with local Chromium override | Five scenarios PASS in 3.3 seconds; backend stopped and diagnostic database removed |

The restricted workspace could not download normal Playwright Chromium. The parent prepared an external Chromium 153 executable at `/tmp/chromium`. Local diagnostic invocation supplied `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium` and a JSON args array from the externally installed Sparticuz package, excluding `--single-process`. That binary package is not added to this repository or its production dependencies. CI uses standard Playwright Chromium instead.

## Genuine harness failures and repair

An initial local attempt started the server and browser tests in separate isolated command calls; tests correctly failed because the server was unreachable from the second call. Running server and browser tests in one orchestration command resolved that environment boundary.

The first connected browser run exposed a test locator mistake: exact `getByLabel('Account type')` did not match the select because its enclosing label contains option text. Changed the test/helper to the actual accessible combobox role and exact name. This was a test-harness correction, not an invented product bug. The subsequent five-scenario runs passed with actual browser interaction.

## Verification boundary and handoff

These local browser results use SQLite and do not satisfy the required PostgreSQL/Compose evidence. The actual GitHub Actions Playwright run and independent QA verdict remain pending publication/execution. No PostgreSQL browser PASS, issue closure or live cloud deployment is claimed here. Engineer did not close the issue or implement later feature issues.
