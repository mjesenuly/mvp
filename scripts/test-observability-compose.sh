#!/usr/bin/env bash
set -euo pipefail

compose=(docker compose --env-file .env.test -f compose.yaml -f compose.observability.yaml)
app="http://127.0.0.1:3000"
grafana="http://127.0.0.1:3001"
proxy="$grafana/api/datasources/proxy/uid"
prometheus="$proxy/prometheus/api/v1/query"

wait_until() {
  local description="$1" deadline=$((SECONDS + $2))
  shift 2
  until "$@"; do
    if (( SECONDS >= deadline )); then
      echo "Timed out waiting for $description." >&2
      return 1
    fi
    sleep 5
  done
  echo "Verified $description"
}

metric() {
  curl -fsSG --max-time 5 "$prometheus" --data-urlencode "query=$1" |
    jq -e '.data.result | any(.[].value[1]; tonumber >= 1)' >/dev/null
}

logs_exported() {
  curl -fsSG --max-time 5 "$proxy/loki/loki/api/v1/query_range" \
    --data-urlencode 'query={service_name="repairlens"} |= "RepairLens API response"' |
    jq -e '.data.result | length > 0' >/dev/null
}

traces_exported() {
  curl -fsSG --max-time 5 "$proxy/tempo/api/search" \
    --data-urlencode 'q={ resource.service.name = "repairlens" }' |
    jq -e '.traces | length > 0' >/dev/null
}

app_ready() { curl -fsS --max-time 5 "$app/api/health" >/dev/null; }
dashboard_ready() { curl -fsS --max-time 5 "$grafana/api/dashboards/uid/repairlens-observability" >/dev/null; }
oncall_ready() {
  "${compose[@]}" exec -T oncall python -c \
    'from urllib.request import urlopen; assert urlopen("http://localhost:8080/health").status == 204'
}
response_received() {
  "${compose[@]}" logs --no-color oncall | grep '"event": "incident_triage"' >/dev/null
}

wait_until "application health" 120 app_ready
wait_until "provisioned RepairLens dashboard" 150 dashboard_ready
npm run test:integration
wait_until "OTLP business metrics in Prometheus" 120 metric 'repairlens_repairs_completed_total{deployment_environment="development"}'
wait_until "OTLP logs in Loki" 120 logs_exported
wait_until "OTLP traces in Tempo" 120 traces_exported
wait_until "local on-call model" 180 oncall_ready

"${compose[@]}" stop db
for _ in {1..8}; do
  status=$(curl --silent --show-error --max-time 20 --output /dev/null --write-out '%{http_code}' "$app/api/health")
  [[ "$status" == 503 ]]
done
wait_until "Grafana alert followed by a model-generated response" 180 response_received
"${compose[@]}" up --detach db
wait_until "PostgreSQL recovery" 120 app_ready
