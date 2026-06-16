#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AlertHive — Alert Flood Script
# Sends synthetic alerts directly to AlertHive webhook endpoint.
# No Dynatrace required — simulates what DT Workflows would send.
#
# Usage:
#   chmod +x flood-dynatrace-alerts.sh
#   ALERTHIVE_URL=http://localhost:4000 ./flood-dynatrace-alerts.sh
#
# Or with ngrok:
#   ALERTHIVE_URL=https://your-ngrok-url.ngrok-free.app ./flood-dynatrace-alerts.sh
# ─────────────────────────────────────────────────────────────────────────────

ALERTHIVE_URL="${ALERTHIVE_URL:-http://localhost:4000}"
WEBHOOK_SECRET="${ALERTHIVE_WEBHOOK_SECRET:-alerthive-dt-secret-2026}"
ORG_SLUG="${ORG_SLUG:-fedex-ito}"
WEBHOOK_ENDPOINT="${ALERTHIVE_URL}/api/v1/webhooks/dynatrace/${ORG_SLUG}"

# Legacy Dynatrace Events API settings (kept for reference)
DT_ENV="${DT_ENV:-ssp97551}"
DT_TOKEN="${DT_TOKEN:-}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AlertHive — Alert Flood (Direct Webhook)"
echo "  Endpoint    : $WEBHOOK_ENDPOINT"
echo "  Org         : $ORG_SLUG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check AlertHive is reachable
if ! curl -sf "${ALERTHIVE_URL}/api/v1/health" > /dev/null 2>&1; then
  echo "ERROR: Cannot reach AlertHive at $ALERTHIVE_URL"
  echo "  Make sure the API server is running: npm run dev"
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
DELAY=1  # seconds between events

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
  "id": "$EVENT_ID",
  "title": "$TITLE",
  "severityLevel": "$SEVERITY",
  "status": "OPEN",
  "entityName": "$ENTITY",
  "impactedEntity": "$ENTITY",
  "description": "Synthetic flood alert $((i+1)) injected by AlertHive flood script for testing.",
  "problemUrl": "https://${DT_ENV}.apps.dynatrace.com/ui/problems/$EVENT_ID",
  "rootCauseEntity": "$ENTITY",
  "affectedEntitiesCount": $((RANDOM % 5 + 1)),
  "problemDuration": $((RANDOM % 60 + 5))
}
EOF
)

  HTTP_STATUS=$(curl -s -o /tmp/ah_flood_resp.json -w "%{http_code}" \
    -X POST "$WEBHOOK_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "X-AlertHive-Secret: $WEBHOOK_SECRET" \
    -d "$PAYLOAD")

  RESP=$(cat /tmp/ah_flood_resp.json 2>/dev/null)

  if [[ "$HTTP_STATUS" == "201" || "$HTTP_STATUS" == "200" ]]; then
    ALERT_ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "[$((i+1))/$TOTAL] ✅  $SEVERITY → $TITLE"
    [[ -n "$ALERT_ID" ]] && echo "          alert_id: $ALERT_ID"
  else
    echo "[$((i+1))/$TOTAL] ⚠️  HTTP $HTTP_STATUS — $TITLE"
    echo "    Response: $RESP"
  fi

  sleep $DELAY
done
  fi

  sleep $DELAY
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done. Check AlertHive → Alerts for all $TOTAL events."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
