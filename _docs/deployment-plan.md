# RepairLens deployment assignment

Current user-confirmed deadline: **3 November 2026, 14:00 UTC+5**. Repository: https://github.com/mjesenuly/mvp. This continues the completed MVP; its genuine discovery and implementation history remain intact.

## Canonical backlog

| Issue | Scope |
| --- | --- |
| [9](https://github.com/mjesenuly/mvp/issues/9) | Single application Docker image; independent QA PASS and closed |
| [10](https://github.com/mjesenuly/mvp/issues/10) | PostgreSQL, safe SQLite transfer, readiness and single-writer protection |
| [11](https://github.com/mjesenuly/mvp/issues/11) | Persistent Compose stack and real full-stack integration |
| [12](https://github.com/mjesenuly/mvp/issues/12) | Initial managed hosting and exact Compose capability review |
| [13](https://github.com/mjesenuly/mvp/issues/13) | AWS CloudFormation within verified Free account limits |
| [14](https://github.com/mjesenuly/mvp/issues/14) | All-test CI and verified automatic deployment |
| [15](https://github.com/mjesenuly/mvp/issues/15) | Submission evidence and operations documentation |
| [16–36](https://github.com/mjesenuly/mvp/issues?q=label%3Ae2e-test) | Separate Playwright issues for each actual implemented feature |

Keep GitHub authoritative. No implementation issue is complete merely because its files exist. Engineers do not close issues; independent QA records actual checks and closes verified work. Preserve genuine FAIL → repair → retest history.

## Required architecture and scope

Build static React/Vite assets into one Express application image. PostgreSQL is a separate persistent service. The existing whole-state domain remains a single-writer design; a session advisory lock prevents unsafe competing application instances. This is not an HA marketplace. Preserve privacy, fees, accepted snapshots, revisions, photos and server history.

Add Compose, real PostgreSQL integration, Playwright browser tests and frontend/backend CI. Use immutable tested commit identifiers for deployment. Add HTTPS, restricted database access, secure runtime configuration, backup/restore, rollback and teardown instructions. Do not implement deferred password recovery, payments, chat or other new product scope.

## Sources and requirement distinctions

The assignment source was read: https://aishippingblog.com/p/deploy-a-full-stack-app-with-ai-coding . It demonstrates a static frontend served by the backend, PostgreSQL, Compose, browser tests, CloudFormation and test-gated deployment. Its Python/FastAPI stack is an example, not a reason to rewrite this TypeScript application. No claim is made that embedded videos were watched.

The assignment additionally requires separate `e2e-test` issues for every feature and an initial named managed platform deployment. Platform capabilities must be described accurately:

- Railway's official Dockerfile documentation describes Compose-file import into platform services: https://docs.railway.com/builds/dockerfiles . Import is distinct from running Compose as the production orchestrator.
- Render's documented Docker flow builds individual Dockerfiles: https://render.com/docs/docker . Do not call a Render blueprint a native Compose deployment.
- Verify Vercel's current container documentation before any claim; container support alone does not establish support for the required app/database Compose runtime.
- AWS's Free plan and eligibility are account-specific: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html . Confirm the actual plan and credits before provisioning; never upgrade or enable paid-account features.

## Evidence boundaries

The local environment has Node 24.22.1 but no Docker daemon or PostgreSQL server. Local unit/API/SQLite checks are real; actual Docker and PostgreSQL checks run on GitHub Actions. The Docker workflow has already succeeded for commit `9293cd0624e5b708c40b676346c3a77746f0d6ae`: https://github.com/mjesenuly/mvp/actions/runs/41533182656 . Independent QA closed issue 9 after inspecting the run. Cloud account access and a working live URL must be verified separately; CI success alone is not cloud deployment.
