# RepairLens — assignment completion and evidence (3 November 2026)

## Verified by the student during this session

- Public deployment: https://repairlens-mvp.onrender.com
- Health endpoint: https://repairlens-mvp.onrender.com/api/health
- Reported response: `{"status":"ok","storage":"postgres"}`
- Render service dashboard displayed `Deploy succeeded | Live` on the Free instance.
- GitHub Actions commit `b8afcc3`: verification, container verification, Compose integration, PostgreSQL verification and Playwright E2E #50 all showed green in the student's screenshot.

## Implemented in the repository

- Multi-stage Dockerfile serving built static frontend and backend from a single image.
- PostgreSQL-backed storage, migration tools, and Docker Compose app+database.
- GitHub Actions verification, container, Compose, PostgreSQL and Playwright E2E workflows.
- GitHub Issues with `e2e-test` label for each individual feature.
- Playwright browser tests for registration, sign-in, sign-out, workshop approval, private requests, protected photos, repair creation, offer submission/editing/withdrawal/comparison/acceptance, revision proposal/acceptance/rejection, repair start/ready/completion, customer cancellation, activity history, and empty/error states.
- Isolated test accounts and real PostgreSQL requests in `e2e/journey.ts`. No network mocks.

## Critical distinctions and outstanding verification

1. **Latest E2E tests:** The added tests after commit `b8afcc3` require a fresh successful GitHub Actions run. Do not claim success based on an earlier green run.
2. **Render deployment:** Render Blueprint deploys a Docker web service and managed PostgreSQL separately. It does not execute `compose.yaml` on Render. Docker Compose is exercised in GitHub Actions.
3. **CD:** Render auto-deploys on commits independently of GitHub Actions checks; deployments are not gated by all CI checks. Do not claim gated CD.
4. **Cloud IaC:** AWS CloudFormation or GCP Terraform deployment has **not** been performed. An eligible cloud account, billing authorization, budget and cost controls are prerequisites. Do not incur cloud charges without the owner's explicit approval.
5. **Production-grade:** Render Free is a demonstration tier, not production-grade. The free PostgreSQL instance expires after 30 days and has no backups; the free web service sleeps when idle.
6. **Submission:** Include the actual passing Actions run URLs, live site and health screenshot, and honest disclosure of any unfulfilled cloud provider requirement.

## Links

- Repository: https://github.com/mjesenuly/mvp
- CI runs: https://github.com/mjesenuly/mvp/actions
- E2E issues: https://github.com/mjesenuly/mvp/issues?q=label%3Ae2e-test
- Render guide: `_docs/render-free.md`
