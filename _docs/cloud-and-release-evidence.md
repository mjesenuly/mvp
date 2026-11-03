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
- Existing Render `render.yaml` has automatic deployment on commits, independent of GitHub Actions. To enforce a **strict** test-gated release, disable Render auto-deploy in the Render dashboard and configure its deploy hook secret. Until then, do not claim all deployments are gated.
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
| Test-gated CD | Gate added; needs Render hook and auto-deploy disabled |

Do not present the last two items as completed deployments.
