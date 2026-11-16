# RepairLens DevOps and Observability

## Environments and promotion

| Environment | Service | Storage | Deployment |
| --- | --- | --- | --- |
| Development | [repairlens-dev](https://repairlens-dev.onrender.com) | Independent SQLite with disposable data on Render's free filesystem | Render builds main commits automatically |
| Production | [repairlens-mvp](https://repairlens-mvp.onrender.com) | Existing PostgreSQL | Manual promotion only |
| Local demo | http://localhost:3000 | Dedicated Compose PostgreSQL | Docker Compose |

In [GitHub Actions](https://github.com/mjesenuly/mvp/actions/workflows/release-gate.yml), choose **Promote RepairLens to production → Run workflow → main**. It waits for five CI workflows for that exact commit and verifies that development is serving the same SHA with healthy SQLite. It then requests a Render deploy with that SHA and waits for production to serve it with healthy PostgreSQL. The SHA is available in the `X-RepairLens-Commit` health response header on Render. The workflow uses the existing production deploy hook in the GitHub Actions secret `RENDER_DEPLOY_HOOK`. Render production auto-deploy must remain off.

Development data can reset after a redeploy or instance replacement. Use the dedicated `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the development service's Render environment settings to exercise workshop approval. The Compose demo has disposable fixture credentials already configured via `.env.test`.

## Run the complete observability demo

Requires Docker Compose and a connection for downloading container images and the Ollama model. No model API key is required.

```bash
docker compose --env-file .env.test -f compose.yaml -f compose.observability.yaml up --build -d
```

1. Open [RepairLens](http://localhost:3000) and [RepairLens Observability](http://localhost:3001/d/repairlens-observability).
2. Run `BASE_URL=http://127.0.0.1:3000 npm run test:integration` once against a fresh demo stack to exercise the request-to-repair journey. Alternatively create a request and progress it through the UI.
3. In Grafana Explore, use Loki with `{service_name="repairlens"}` or Tempo with TraceQL `{ resource.service.name = "repairlens" }`. Telemetry exports every few seconds. HTTP logs correlate to spans by trace ID and avoid request bodies, cookies, customer identifiers and raw URL parameters.

| Prometheus metric | Meaning |
| --- | --- |
| `repairlens_requests_created_total` | Successfully created repair requests |
| `repairlens_offers_saved_total` | Successfully submitted or edited offers |
| `repairlens_offers_accepted_total` | Successfully selected offers |
| `repairlens_repairs_completed_total` | Repairs confirmed complete by customers |
| `repairlens_api_server_errors_total` | Completed API responses with status 5xx |
| `repairlens_api_duration_seconds_bucket` | API latency distribution used to show p95 |

The Node.js OpenTelemetry SDK sends metrics, request traces and structured logs over OTLP HTTP to the Collector bundled with Grafana LGTM. The Collector forwards them to Prometheus, Tempo and Loki. The dashboard groups data by `deployment_environment`.

## Demonstrate alert delivery and AI triage

Run the full smoke check on a fresh local demo stack.

```bash
bash scripts/test-observability-compose.sh
```

The script runs the business journey, verifies ingestion of all three signals, then briefly stops only the local database and requests the health endpoint to produce actual 503 responses. Grafana fires after three or more API 5xx responses in a rolling five-minute window, with a 20-second pending period. The alert reaches the on-call service by webhook. The service passes the environment and metric count to Ollama, then logs an `incident_triage` record with the model response. Resolution produces an `incident_resolved` record. The agent recommends checks for a human operator and has no deployment or database credentials.

Inspect the response with the following command.

```bash
docker compose --env-file .env.test -f compose.yaml -f compose.observability.yaml logs oncall
```

Run the demo only against the disposable local stack. If interrupted while PostgreSQL is stopped, start it again with `docker compose --env-file .env.test -f compose.yaml -f compose.observability.yaml up -d db`, then restart the app container. GitHub Actions runs the same demo and attaches the dashboard, alert rule, and runtime logs as `observability-evidence`.

## Connect hosted telemetry

The monitoring stack above is local or CI. To send telemetry from Render, configure an externally reachable HTTPS OTLP HTTP receiver, set `OTEL_EXPORTER_OTLP_ENDPOINT` on each Render service to its base OTLP URL, and store any receiver authorization in `OTEL_EXPORTER_OTLP_HEADERS`. The app sets the service name to `repairlens`. Hosted development uses `DEPLOYMENT_ENVIRONMENT=development`, and the Render application defaults to `production` without that override. Set up the dashboard and alerting on the receiving Grafana instance and point its webhook at an authenticated or private on-call endpoint.
