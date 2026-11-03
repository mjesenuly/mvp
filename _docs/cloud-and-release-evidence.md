# RepairLens — cloud infrastructure and release evidence

## Confirmed evidence
- GitHub Actions Playwright run #82 passed: https://github.com/mjesenuly/mvp/actions/runs/41606010341
- The user confirmed the green result for all 29 Playwright tests.
- Render deployment: https://repairlens-mvp.onrender.com
- PostgreSQL health response reported by user: `{"status":"ok","storage":"postgres"}`.
- Compose runs PostgreSQL and the combined frontend/backend Docker image in CI.

## AWS CloudFormation (code delivered, deployment NOT performed)
- Template: [infrastructure/aws/cloudformation.yaml](../infrastructure/aws/cloudformation.yaml)
- Creates an EC2 host, encrypted EBS root volume and security group, then bootstraps the existing Compose stack.
- No cloud account was accessed, no stack was created, and no billing authorization was provided.
- This is a **demo infrastructure template**, NOT a production-grade AWS deployment: HTTP on port 3000, single host, no TLS, no managed DB, no automated backup, no redundancy. Do not claim otherwise.
- The EC2 user-data mechanism is not a secure secret manager; use AWS Secrets Manager/SSM for any real deployment. Do not put real credentials into this demo.
- Before deploying: confirm the specific account's Free Tier/credits, verify billing alerts and EC2/EBS/public IPv4 charges, choose a subnet with public IPv4 and internet access, and obtain explicit approval for possible charges. `t3.micro` is **not universally free**.
- To remove charges after a demo: delete the CloudFormation stack and check for retained billable resources.

## CI/CD release gate
- [release-gate.yml](../.github/workflows/release-gate.yml) verifies that the same commit SHA passed five workflows: backend, container, Compose, PostgreSQL, Playwright.
- Optional deployment requires repository Actions secret `RENDER_DEPLOY_HOOK`. Without it, the gate performs **no deployment**.
- The Render Blueprint and dashboard have auto-deploy disabled. The release gate is manually triggered to avoid concurrent releases, and checks that the exact commit passed the required CI workflows. Do not claim an end-to-end successful release until Render reports Live for the same commit.
- GitHub workflow success means the hook was accepted, not that a subsequent hosted rollout was healthy. Check Render health separately.

## Requirement status
| Requirement | Status |
| --- | --- |
| Single frontend/backend Docker image | Implemented and tested |
| SQLite to PostgreSQL | Implemented and tested |
| Docker Compose with database | Implemented and tested |
| Separate Playwright E2E feature coverage and labeled issues | 29 tests, passing run #82 |
| CI across backend, container, Compose, PostgreSQL, browser | Implemented |
| Live Render demo | User-verified |
| AWS CloudFormation infrastructure as code | Added, not deployed |
| AWS production-grade deployment | Not completed; requires account, security hardening and billing authorization |
| Test-gated CD | Manual release gate is configured; post-deploy health/commit verification is pending |

Do not present the last two items as completed deployments.

## November 3: Render handoff fix — awaiting live validation
- Prior rolling deployments failed due to session-wide writer lock, followed by repeated shutdowns from the handoff notification protocol.
- Reworked PostgreSQL to acquire advisory lock only during initial migration and each HTTP operation; HTTP requests refresh the persisted snapshot before handling them to avoid cross-instance lost updates.
- Added a PostgreSQL regression test for two simultaneously running HTTP API instances and concurrent registrations with cross-instance sessions.
- The current production database must not be reset, dropped, or manually edited to address deploy failures.
- No claim of deployment success should be made until the new code passes PostgreSQL CI, all five checks pass for the **same** SHA, and Render shows the exact commit Live with /api/health returning postgres.
- Any retry of a failed deploy should be investigated from Render logs before triggering another. This code path is designed for a brief first handoff from the older single-writer version to the concurrent-safe version.
- AWS/GCP production account deployment remains unperformed and is not covered by this Render fix.
