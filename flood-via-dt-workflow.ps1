#!/usr/bin/env pwsh
# ─────────────────────────────────────────────────────────────────────────────
# AlertHive — Flood via Dynatrace Workflow
# Triggers the DT Workflow API directly with mock problem payloads.
# The workflow then calls the AlertHive webhook — end-to-end DT path.
#
# Usage:
#   $env:DT_TOKEN = "dt0c01.YOUR_TOKEN"
#   .\flood-via-dt-workflow.ps1
# ─────────────────────────────────────────────────────────────────────────────

$DT_ENV      = "ssp97551"
$WORKFLOW_ID = "bdbd6c35-9749-4807-bea2-0907ba3b3530"
$DT_TOKEN    = $env:DT_TOKEN

if (-not $DT_TOKEN) {
    Write-Host "ERROR: Set DT_TOKEN environment variable first:" -ForegroundColor Red
    Write-Host '  $env:DT_TOKEN = "dt0c01.YOUR_TOKEN_HERE"' -ForegroundColor Yellow
    exit 1
}

$WORKFLOW_URL = "https://$DT_ENV.apps.dynatrace.com/platform/automation/v1/workflows/$WORKFLOW_ID/run"

$headers = @{
    "Authorization" = "Api-Token $DT_TOKEN"
    "Content-Type"  = "application/json"
}

# ── Problem definitions ────────────────────────────────────────────────────────
$problems = @(
    @{ title = "High CPU usage on payment-service";          severity = "AVAILABILITY";        entity = "SERVICE-payment-service-001";    impact = "APPLICATION" }
    @{ title = "Response time degraded on checkout-api";     severity = "PERFORMANCE";         entity = "SERVICE-checkout-api-002";       impact = "APPLICATION" }
    @{ title = "Memory leak detected on order-processor";    severity = "ERROR";               entity = "SERVICE-order-processor-003";    impact = "SERVICE" }
    @{ title = "Database connection pool exhausted";         severity = "RESOURCE_CONTENTION"; entity = "SERVICE-prod-db-01-004";         impact = "INFRASTRUCTURE" }
    @{ title = "Disk I/O saturation on analytics-worker";    severity = "AVAILABILITY";        entity = "HOST-analytics-worker-005";      impact = "INFRASTRUCTURE" }
    @{ title = "HTTP error rate spike on gateway-service";   severity = "ERROR";               entity = "SERVICE-gateway-service-006";    impact = "APPLICATION" }
    @{ title = "Service unavailable: shipment-tracker";      severity = "AVAILABILITY";        entity = "SERVICE-shipment-tracker-007";   impact = "APPLICATION" }
    @{ title = "SSL certificate expiring in 3 days";         severity = "PERFORMANCE";         entity = "SERVICE-api-fedex-internal-008"; impact = "APPLICATION" }
    @{ title = "Kubernetes pod crash-looping: fraud-detection-v2"; severity = "ERROR";         entity = "CLOUD_APPLICATION-fraud-009";    impact = "SERVICE" }
    @{ title = "Message queue backlog critical: kafka";      severity = "RESOURCE_CONTENTION"; entity = "SERVICE-kafka-010";              impact = "INFRASTRUCTURE" }
    @{ title = "Redis cache miss rate above 80%";            severity = "PERFORMANCE";         entity = "SERVICE-session-store-011";      impact = "SERVICE" }
    @{ title = "Third-party API timeout: FedEx Tracking";    severity = "ERROR";               entity = "SERVICE-fedex-tracking-012";     impact = "APPLICATION" }
    @{ title = "Unusual traffic spike on mobile-api";        severity = "PERFORMANCE";         entity = "SERVICE-mobile-api-013";         impact = "APPLICATION" }
    @{ title = "Host unreachable: prod-monitoring-01";       severity = "AVAILABILITY";        entity = "HOST-prod-monitoring-014";       impact = "INFRASTRUCTURE" }
    @{ title = "JVM heap pressure: reporting-service";       severity = "RESOURCE_CONTENTION"; entity = "SERVICE-reporting-015";          impact = "SERVICE" }
)

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  AlertHive — Flood via DT Workflow" -ForegroundColor Cyan
Write-Host "  Workflow : $WORKFLOW_ID" -ForegroundColor Cyan
Write-Host "  Problems : $($problems.Count)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$success = 0
$failed  = 0

foreach ($p in $problems) {
    $problemId = "P-" + (Get-Random -Maximum 99999).ToString("D5")
    $now       = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

    $body = @{
        params = @{
            event = @{
                "event.kind"             = "DAVIS_PROBLEM"
                "event.id"               = $problemId
                "event.status"           = "OPEN"
                "event.name"             = $p.title
                "event.category"         = $p.severity
                "event.start_time"       = $now
                "display.id"             = $problemId
                "display.url"            = "https://$DT_ENV.apps.dynatrace.com/ui/problems/$problemId"
                "affected_entity.name"   = ($p.entity -split '-' | Select-Object -Skip 1 | Select-Object -SkipLast 1) -join '-'
                "affected_entity.id"     = $p.entity
                "impact_level"           = $p.impact
                "severity_level"         = $p.severity
                "davis_ai_problem_title" = $p.title
            }
        }
    } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri $WORKFLOW_URL -Method POST -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "  [OK] $($p.title)" -ForegroundColor Green
        $success++
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  [FAIL $statusCode] $($p.title)" -ForegroundColor Red
        if ($statusCode -eq 400) {
            Write-Host "       Hint: Check workflow is set to 'On demand' trigger in DT UI" -ForegroundColor Yellow
        }
        if ($statusCode -eq 401) {
            Write-Host "       Hint: Token expired or missing 'automation:workflows:run' scope" -ForegroundColor Yellow
        }
        $failed++
    }

    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Done: $success succeeded, $failed failed" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
