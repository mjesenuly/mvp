# Playwright feature coverage plan

**Status: PARTIAL IMPLEMENTATION.** Registration issue 16 has a browser test implementation and a successful explicitly local SQLite diagnostic; required real PostgreSQL/Compose execution and independent QA are recorded separately. Remaining feature rows are still planned. This document does not claim issue closure. GitHub Issues are the canonical backlog. Implement one selected issue at a time after its predecessor passes independent QA; issue #11 is currently the Compose prerequisite. Update the evidence column only from actual executions.

The approved interface is in `frontend/src/App.tsx`; the same-origin transport is in `frontend/src/api-service.ts`. Existing DOM tests and Node HTTP tests provide useful cases, but they are not Playwright browser evidence.

## Feature-to-issue-to-test mapping

Each row is a separate real GitHub Issue labelled `e2e-test`. The proposed filenames keep independent feature selection straightforward.

| Issue | Feature | Proposed test file | Browser acceptance target and negative cases | Evidence |
| --- | --- | --- | --- | --- |
| [16](https://github.com/mjesenuly/mvp/issues/16) | Account registration | `e2e/16-registration.spec.ts` | Submit customer and workshop registration forms; verify customer workspace versus pending approval. Check required/invalid fields, duplicate email, and absence of public admin role. Supplement with actual API rejection of `role: admin`. | Implemented; local browser/SQLite diagnostic 5/5 PASS. Real PostgreSQL/Compose CI and independent QA pending. |
| [17](https://github.com/mjesenuly/mvp/issues/17) | Sign-in and session restoration | `e2e/17-sign-in.spec.ts` | Sign in using the form, reload and retain the same account. Wrong password produces the real server error and no private workspace. | Planned |
| [18](https://github.com/mjesenuly/mvp/issues/18) | Logout | `e2e/18-logout.spec.ts` | Click `Sign out`; reload stays signed out. A retained pre-logout cookie must no longer access protected API routes. | Planned |
| [19](https://github.com/mjesenuly/mvp/issues/19) | Workshop approval | `e2e/19-workshop-approval.spec.ts` | Pending workshop sees approval screen; admin approves the intended workshop card; workshop checks approval status and sees workspace. Supplement with actual non-admin approval rejection. | Planned |
| [20](https://github.com/mjesenuly/mvp/issues/20) | Repair request creation | `e2e/20-request-creation.spec.ts` | Submit a unique device/fault/city through the form and inspect the created request. Empty required fields prevent submission. Supplement with unsupported category and workshop-role API rejection. | Planned |
| [21](https://github.com/mjesenuly/mvp/issues/21) | Private browsing and ownership | `e2e/21-private-browsing.spec.ts` | Owner sees own unique request; unrelated customer does not. Approved workshop can view eligible request/contact; pending workshop and anonymous user cannot. Verify competing offer data is absent from workshop API projections. | Planned |
| [22](https://github.com/mjesenuly/mvp/issues/22) | Protected photos | `e2e/22-photos.spec.ts` | Upload a genuine small PNG via the request form; verify image loads for owner/approved workshop. Retrieve the real generated photo URL using anonymous/unrelated sessions and assert denial. Reject invalid MIME/content, four files, and an oversized file. | Planned |
| [23](https://github.com/mjesenuly/mvp/issues/23) | Offer submission | `e2e/23-offer-submission.spec.ts` | Approved workshop fills and saves structured terms; customer sees that quote. Fixed quote with an unknown required fee yields a real validation error. Pending workshops/customers cannot submit. | Planned |
| [24](https://github.com/mjesenuly/mvp/issues/24) | Offer editing | `e2e/24-offer-editing.spec.ts` | Workshop clicks `Edit your offer`, updates scope/turnaround/fees, and customer refreshes to see the change. Exactly one active offer remains; post-selection updates fail without changing accepted terms. | Planned |
| [25](https://github.com/mjesenuly/mvp/issues/25) | Offer withdrawal | `e2e/25-offer-withdrawal.spec.ts` | Workshop withdraws its active offer; owner refresh no longer exposes a choice for it. Real API cannot select withdrawn offer; selected offer cannot be withdrawn; competitor cannot alter another workshop's offer. | Planned |
| [26](https://github.com/mjesenuly/mvp/issues/26) | Comparison and transparent pricing | `e2e/26-comparison.spec.ts` | Owner compares two workshop rows. Assert fixed/estimated labels, known subtotal, `Unknown`, uncertainty warning, and separately labelled optional charges. Compare values per row; do not assume a globally unique subtotal. | Planned |
| [27](https://github.com/mjesenuly/mvp/issues/27) | Acceptance and preserved terms | `e2e/27-acceptance.spec.ts` | Owner chooses a specific workshop row and sees accepted terms plus one `Selected` marker. Other sessions refresh consistently. Supplement with truly concurrent real HTTP acceptance attempts yielding one success and conflict; re-fetch state to confirm one winner and immutable snapshot. | Planned |
| [28](https://github.com/mjesenuly/mvp/issues/28) | Revision proposal | `e2e/28-revision-proposal.spec.ts` | Selected workshop proposes different terms through the UI; owner sees pending terms while accepted terms stay unchanged. Start is unavailable while revision is pending; other workshop cannot propose. | Planned |
| [29](https://github.com/mjesenuly/mvp/issues/29) | Customer revision approval | `e2e/29-revision-approval.spec.ts` | Owner clicks `Accept revised terms`; pending panel disappears, accepted terms change, and selected workshop can start. Other actors cannot approve. | Planned |
| [30](https://github.com/mjesenuly/mvp/issues/30) | Customer revision rejection | `e2e/30-revision-rejection.spec.ts` | Owner clicks `Reject and cancel request`; request becomes terminal cancelled. Real start/ready/complete attempts cannot reopen it. | Planned |
| [31](https://github.com/mjesenuly/mvp/issues/31) | Starting repair | `e2e/31-start-repair.spec.ts` | Selected workshop starts an accepted job with no pending terms. Customer refresh sees `in repair`; invalid state/wrong workshop attempts fail. | Planned |
| [32](https://github.com/mjesenuly/mvp/issues/32) | Marking repair ready | `e2e/32-mark-ready.spec.ts` | Selected workshop clicks `Mark ready for collection`; owner refresh sees `ready` and the completion action. Wrong actor/premature transition fails. | Planned |
| [33](https://github.com/mjesenuly/mvp/issues/33) | Customer completion | `e2e/33-completion.spec.ts` | Owner clicks `Confirm receipt and complete` after ready; request is completed and cannot reopen. Workshop/unrelated customer cannot complete it. | Planned |
| [34](https://github.com/mjesenuly/mvp/issues/34) | Customer cancellation | `e2e/34-cancellation.spec.ts` | Owner cancels separate open and accepted fixtures. No cancellation action exists after repair starts; real endpoint also rejects that attempt and non-owner cancellation. | Planned |
| [35](https://github.com/mjesenuly/mvp/issues/35) | Activity history | `e2e/35-history.spec.ts` | Expand `Activity and previous terms`; assert meaningful events and previous accepted/revised terms remain after reload. Validate ISO server timestamp prefixes without expecting exact clock values. API attempts to submit history fields are rejected without mutation. | Planned |
| [36](https://github.com/mjesenuly/mvp/issues/36) | Empty/error states and mock isolation | `e2e/36-workspace-states.spec.ts` | New customer sees `No requests yet`; a real failed sign-in yields the alert and recovery remains usable. Normal URL stays `Private workspace` and has no fictional data. Explicit `?mode=mock` has its clear fictional/reset banner; this preview is tested separately, not substituted for real-stack tests. | Planned |

## Actual interface locator guide

Use semantic locators from the current interface. Prefer exact accessible names and scope repeated controls to their form, workshop card, table row, or repair detail. No existing `data-testid` contract is assumed.

| Interaction | Current accessible locator or scope |
| --- | --- |
| Open registration tab | `getByRole('button', { name: 'Create account', exact: true })` before the registration form is open |
| Submit auth form | `locator('form').getByRole('button', { name: 'Sign in', exact: true })` or `Create account`; both names also occur on tabs, so scope to the form |
| Registration fields | `getByLabel('Full name / workshop name')`, `Account type` (`customer` / `workshop` values), `Phone or contact details`, `Email`, `Password` |
| Auth/workspace headings | `Welcome back`, `Create your account`, `Approval is pending.`, `Workshop approvals`, `Repair requests`, `Find your next repair` |
| Workshop approval | `locator('article').filter({ has: getByRole('heading', { name: uniqueWorkshopName, exact: true }) }).getByRole('button', { name: 'Approve workshop' })` |
| Refresh actions | `Refresh` for signed-in users; `Check approval status` on pending screen; `Refresh workspace` inside error alert |
| Request form | `+ New request`; fields `Category`, `City`, `Brand`, `Model`, `What is wrong?`, `Photos (optional, up to 3 × 3 MB)`; submit `Submit request` |
| Select exact request | `getByRole('navigation', { name: 'Repair requests' }).getByRole('button').filter({ hasText: uniqueModel })`; model must be unique per test |
| Request status | Scope to `.detail-heading .badge` or `.progress .current`; status text also occurs in request cards and every progress step, so avoid global `getByText('accepted')` |
| Photo assertion | `getByRole('img', { name: uniquePhotoFilename })`; verify `naturalWidth > 0` for a complete valid image, not only element presence |
| Offer form | `Send an offer` / `Edit your offer`; fields `Quote type`, `Work included`, `Labour fee`, `Parts fee`, `Diagnostics fee`, `Optional charge (separate)`, `Turnaround (days)`, `Warranty`, `Exclusions`; submit `Save offer` |
| Quote selection/comparison | `getByRole('table').getByRole('row').filter({ hasText: uniqueWorkshopName })`; within row use `Choose offer` or assert `Selected` |
| Accepted terms | `locator('section.accepted')` contains heading `Accepted terms` and `.terms-view`; distinguish from current offer table |
| Pending revision | `locator('section.revision')`, heading `New terms need your approval`, `Accept revised terms`, `Reject and cancel request` |
| Revision form | `Propose revised terms`; same labelled fields as offer form; submit `Send revision for approval` |
| Repair stages | `Start repair`, `Mark ready for collection`, `Confirm receipt and complete`, `Cancel request` |
| History | `getByText('Activity and previous terms', { exact: true })` is the `<summary>`; click it and scope events to `locator('.history')` |
| Notices/errors | `getByRole('alert')` contains `The request could not be completed.` and actual server text; success notice is `Changes saved.` in a `status` element |

## Shared harness recommendations

1. Use one built frontend/API origin from `E2E_BASE_URL`, matching the Compose `APP_ORIGIN` exactly. Assert `/api/health` reports PostgreSQL before the suite. A local SQLite diagnostic run must be labelled separately and cannot satisfy the required Compose/PostgreSQL evidence.
2. Give customer, workshop, competitor, admin and unrelated customer independent browser contexts. Each context has its own HttpOnly session cookie. Do not share a single page by logging roles in and out for simultaneous journeys.
3. Use deterministic per-test identifiers incorporating the test's issue number, run identifier and worker index; keep all data fictional. Avoid fixed emails that collide when the same persistent stack is used twice. Do not delete production data or expose a public reset endpoint.
4. Real API helpers may seed unrelated prerequisites and advance states outside the selected feature's target. They must call the actual HTTP API, retain context cookies, fetch `csrfToken` from `/api/session`, and send it in `X-CSRF-Token` for mutations. The action under test must be performed through the browser; e.g. issue 24 must click the edit form, not merely call the offer endpoint and inspect rendered output.
5. Use a shared `createScenario` fixture that returns each actor's context/page/API helper, the request ID and unique labels. Add explicit `refreshAndSelect(page, model)` and `fillQuote(page, terms)` helpers. Seed money in integer minor units; the UI inputs take whole KZT with optional decimals. Use literal expected formatted amounts or `Intl.NumberFormat` expectations, not the production `money()`/`subtotal()` implementation as the test oracle.
6. Use actual valid PNG fixture bytes for successful image rendering. Header-only fake PNGs accepted by existing API tests cannot prove the browser displays an image. For oversized and invalid-content negative cases, create dedicated synthetic disposable files inside test fixtures/output.
7. Avoid fixed sleeps and `networkidle`. Wait for the relevant API response and resulting heading/row/status, or Playwright's auto-retrying assertions. Success status text may persist from a prior action: observe the response or the changed UI value, not only `Changes saved.`.
8. Use zero retries initially. Configure HTML/JUnit reports, failure screenshot and trace retention. Report failures honestly; do not convert failing suites into skipped/pass evidence. One local successful run is not proof that GitHub Actions ran.
9. Actual denial checks for hidden UI actions belong in context-bound Playwright `APIRequestContext` calls. Concurrency uses truly simultaneous requests or two owner contexts and verifies authoritative state afterward. Do not use two sequential clicks as evidence of a race test.
10. UI error coverage should induce real backend validation/auth/conflict responses. If the browser is put offline, label that as a browser/network fault case; do not stub backend responses or switch critical workflows to mock mode. The explicit mock preview in issue 36 is a separate product feature only.

## Evidence updates required from engineering and QA

For each issue, record the actual filename, scenario names, exact feature-selecting command, run result, tested commit, and a workflow/report link when published. QA must verify every acceptance criterion, preserve genuine failures and repairs, then close the corresponding real issue. Replace `Planned` only with evidence-supported statuses. Final full-suite execution must use the actual Compose application and PostgreSQL and include all 21 feature files.
