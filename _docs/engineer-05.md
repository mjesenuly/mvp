# Iteration 5 engineering handoff — issue #6

## Implementation

`ApiService` implements the existing `RepairService` interface against all real API operation routes. The transport uses same-origin HttpOnly cookies and the server-issued CSRF token, sends only contract-allowed bodies, and retains server error codes/status/messages. Photo data URLs pass through the existing validated upload contract; response photo URLs remain authorized server routes. No ORM or backend internals enter UI components.

The normal application now defaults to `ApiService`. Fictional mock preview is explicitly selected with `?mode=mock` and retains its visible mock banner and fictional credentials. API failures never silently switch to mock data.

Authenticated workspaces have a Refresh action to discover offers and approval changes from other sessions. Error panels allow refresh/recovery. On 401/403/409 mutation failure, the UI reloads the authorized server snapshot while retaining the failure explanation; an expired session therefore clears private data and restores the sign-in form. Stale selections refresh to current status. Initial load and subsequent operations show loading states.

## Actual verification

- `npm ci`: PASS; 213 packages installed.
- `npm test`: PASS, 14 tests in 4 files.
- `npm run build`: PASS, TypeScript check and Vite production build (31 modules transformed).
- Service unit tests: CSRF/cookie transport, every operation mapping, route/body separation, photo payload, 401/403/409/422/500 propagation, malformed responses and network failures.
- DOM tests: existing customer journey and service error; added conflict state refresh and session-expiry clearing/sign-in recovery.
- Running integration test: actual `ApiService` through HTTP to Express with a temporary ORM-managed SQLite file. Registers customer/workshops, observes pending approval, authenticates seeded admin, approves workshops, creates request/photo, edits and withdraws/re-submits offer, checks competing workshop privacy, selects and rejects repeated selection, proposes/accepts revision, blocks premature start, starts/marks ready/completes, restarts the server/database and verifies the original cookie session, completed state and accepted revision remain.

An initial new unit-test fixture reused a consumed Response object and failed; the fixture was corrected to return a fresh Response for each call. The final full suite above passed. This was a test fixture issue, not a reported application defect.

## Limits and handoff

These are service, HTTP integration and DOM checks, not browser interaction or visual testing. Independent QA and actual browser inspection remain required. No issue closure or remote publication is claimed here. This change is issue #6 only; issue #7 was not started. Existing backend/contract/Vite configuration remain unchanged.
