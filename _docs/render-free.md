# RepairLens — no-card public demonstration on Render

## Scope and trade-offs

Render's official free tier offers a Docker web service and a separate free managed PostgreSQL database without a payment card. This is a **free coursework demonstration**, not production-grade hosting. Render's free Postgres expires after **30 days**, has **1 GB** storage, no backups and may be unavailable during maintenance. The free web service sleeps when idle, has resource limits, and can restart. Preserve a local copy of important demonstration data. See https://render.com/docs/free .

**Important assignment distinction:** Render Blueprint provisions two Render services from `render.yaml`; it does **not** run Docker Compose. `compose.yaml` remains the verified local and GitHub Actions configuration. Do not claim that Render itself deployed using Compose.

## Deploy without a bank card

1. Sign in to https://dashboard.render.com/ using GitHub. Do not add a payment method or upgrade a workspace/service plan.
2. Select **New > Blueprint** and authorize repository `mjesenuly/mvp`. Select branch `main` and the repository's `render.yaml`.
3. Verify both resources explicitly show **Free**: `repairlens-mvp` (Docker web service) and `repairlens-postgres` (PostgreSQL). If a paid option is required, stop.
4. Supply private `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 10 characters. Never commit them. `DATABASE_URL` is populated by the Blueprint from the database.
5. Set `APP_ORIGIN` to the **exact public HTTPS URL assigned to the web service**, without trailing slash, for example `https://repairlens-mvp.onrender.com` only if that is the URL Render actually assigns. Do not guess the hostname. If necessary, finish provisioning and then update the environment variable and redeploy.
6. Check `https://<assigned-host>/api/health` returns HTTP 200 with `{"status":"ok","storage":"postgres"}`. Register customer and workshop accounts, sign in as admin to approve the workshop, create a request, submit an offer, accept it and confirm completion.
7. Confirm data survives a normal application restart. Do not delete the database. Keep one web-service instance only: the repository uses a single-writer database lock.
8. In GitHub Actions verify the unit, API, Compose integration and Playwright workflows. Record real run URLs and actual outcomes; checked-in workflows are not proof of passing runs.

## CI/CD

The Blueprint disables Render's built-in automatic deploy. In Render, copy the web service Deploy Hook URL and save it in GitHub under Settings → Secrets and variables → Actions as the repository secret `RENDER_DEPLOY_HOOK`. Keep the URL private.

After a successful Playwright push run on `main`, the release workflow waits for the other four verification workflows for that SHA. It submits that exact SHA to Render only after all five pass. The workflow also supports manual dispatch on `main`. Verify the commit and successful deployment in Render Events, then check `/api/health` for PostgreSQL. A successful hook request alone does not confirm a live deployment.

## Security and billing

Do not expose the database externally or commit credentials. `NODE_ENV=production` enables secure cookies; HTTPS and exact `APP_ORIGIN` are required for mutations. Render free services can be suspended if included usage is exceeded. No card means the platform cannot charge a payment method, but the service may be interrupted. This free setup does not satisfy an AWS CloudFormation or Google Cloud Terraform infrastructure deployment requirement. Terraform can be prepared separately, but without an eligible cloud billing account `terraform apply` remains blocked.

## Submission evidence checklist

- Public HTTPS URL (only after verified)
- Screenshot of both Free resource plans and health response
- Actual GitHub Actions successful run links
- Screenshots of real customer/workshop lifecycle and data after restart
- Clear statement of Render free database expiration and Compose-versus-Blueprint difference
