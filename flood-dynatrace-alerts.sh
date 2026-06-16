#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AlertHive — Dynatrace Alert Flood Script
# Injects synthetic problem events via Dynatrace Events API v2.
# Each event triggers your Workflow → AlertHive automatically.
#
# Usage:
#   chmod +x flood-dynatrace-alerts.sh
#   DT_ENV=ssp97551 DT_TOKEN=<your-api-token> ./flood-dynatrace-alerts.sh
#
# How to get DT_TOKEN:
#   Dynatrace → Settings → Access tokens → Generate token
#   Scopes needed: events.ingest
# ─────────────────────────────────────────────────────────────────────────────

DT_ENV="${DT_ENV:-ssp97551}"
DT_TOKEN="${DT_TOKEN:-}"
DT_BASE="https://${DT_ENV}.live.dynatrace.com/api/v2/events/ingest"

if [[ -z "$DT_TOKEN" ]]; then
  echo "ERROR: DT_TOKEN is not set. Export it before running:"
  echo "  export DT_TOKEN=dt0c01.xxxxxxxxxxxx"
  exit 1
fi

# ── Event definitions ─────────────────────────────────────────────────────────
declare -a TITLES=(
  "High CPU usage on payment-service"
  "Response time degraded on checkout-api"
  "Memory leak detected on order-processor"
  "Database connection pool exhausted on prod-db-01"
  "Disk I/O saturation on analytics-worker"
  "HTTP error rate spike on gateway-service"
  "Service unavailable: shipment-tracker"
  "SSL certificate expiring in 3 days: api.fedex.internal"
  "Kubernetes pod crash-looping: fraud-detection-v2"
  "Message queue backlog critical: shipment-events-kafka"
  "Redis cache miss rate above 80%: session-store"
  "Third-party API timeout: FedEx Tracking API"
  "Anomaly: unusual traffic spike on mobile-api"
  "Host unreachable: prod-monitoring-01"
  "JVM heap pressure: reporting-service"
)

declare -a SEVERITIES=(
  "AVAILABILITY"
  "PERFORMANCE"
  "ERROR"
  "RESOURCE_CONTENTION"
  "AVAILABILITY"
  "ERROR"
  "AVAILABILITY"
  "CUSTOM_ALERT"
  "AVAILABILITY"
  "RESOURCE_CONTENTION"
  "PERFORMANCE"
  "ERROR"
  "PERFORMANCE"
  "AVAILABILITY"
  "RESOURCE_CONTENTION"
)

declare -a ENTITIES=(
  "payment-service-pod-1"
  "checkout-api-v3"
  "order-processor-worker-2"
  "prod-db-01"
  "analytics-worker-node-4"
  "api-gateway-prod"
  "shipment-tracker-service"
  "api.fedex.internal"
  "fraud-detection-pod-v2"
  "shipment-events-kafka-broker"
  "session-store-redis-01"
  "fedex-tracking-api-client"
  "mobile-api-gateway"
  "prod-monitoring-01"
  "reporting-service-jvm"
)

TOTAL=${#TITLES[@]}
DELAY=2  # seconds between events

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AlertHive — Dynatrace Alert Flood"
echo "  Environment : $DT_ENV"
echo "  Events      : $TOTAL"
echo "  Interval    : ${DELAY}s"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for ((i=0; i<TOTAL; i++)); do
  TITLE="${TITLES[$i]}"
  SEVERITY="${SEVERITIES[$i]}"
  ENTITY="${ENTITIES[$i]}"
  EVENT_ID="AH-FLOOD-$(printf '%03d' $((i+1)))-$(date +%s)"

  PAYLOAD=$(cat <<EOF
{
  "eventType": "CUSTOM_ALERT",
  "title": "$TITLE",
  "entitySelector": "type(CUSTOM_DEVICE),entityName(\"$ENTITY\")",
  "properties": {
    "problemId": "$EVENT_ID",
    "severityLevel": "$SEVERITY",
    "entityName": "$ENTITY",
    "status": "OPEN",
    "source": "AlertHive-Flood-Script",
    "description": "Synthetic problem event injected by AlertHive flood script for testing."
  }
}
EOF
)

  HTTP_STATUS=$(curl -s -o /tmp/dt_flood_resp.json -w "%{http_code}" \
    -X POST "$DT_BASE" \
    -H "Authorization: Api-Token $DT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

  RESP=$(cat /tmp/dt_flood_resp.json 2>/dev/null)

  if [[ "$HTTP_STATUS" == "201" || "$HTTP_STATUS" == "200" ]]; then
    echo "[$((i+1))/$TOTAL] ✅  $SEVERITY → $TITLE"
  else
    echo "[$((i+1))/$TOTAL] ⚠️  HTTP $HTTP_STATUS — $TITLE"
    echo "    Response: $RESP"
  fi

  sleep $DELAY
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done. Check AlertHive → Alerts for incoming events."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
