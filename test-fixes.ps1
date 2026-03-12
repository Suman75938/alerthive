$BASE = "http://localhost:4000/api/v1"

# Get token
$loginBody = @{ email = "admin@alerthive.com"; password = "REDACTED_SEED_PASSWORD"; orgSlug = "fedex-ito" }
$lr = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body ($loginBody | ConvertTo-Json) -ContentType "application/json"
$H = @{ Authorization = "Bearer $($lr.data.accessToken)" }
Write-Host "Token: $($lr.data.accessToken.Length) chars" -ForegroundColor Cyan

# --- Test POST /alerts with CORRECT fields (message + priority) ---
try {
    $r = Invoke-RestMethod -Uri "$BASE/alerts" -Method POST -Headers $H -ContentType "application/json" -Body (@{
        title    = "Test Alert"
        message  = "Alert body message"
        source   = "test-runner"
        priority = "low"
    } | ConvertTo-Json)
    Write-Host "[PASS] POST /alerts  id=$($r.data.id)" -ForegroundColor Green
    $alertId = $r.data.id
} catch {
    Write-Host "[FAIL] POST /alerts  $($_.ErrorDetails.Message)" -ForegroundColor Red
    $alertId = $null
}

# --- PATCH /alerts/:id/status ---
if ($alertId) {
    try {
        $r = Invoke-RestMethod -Uri "$BASE/alerts/$alertId/status" -Method PATCH -Headers $H -ContentType "application/json" -Body (@{ status = "acknowledged" } | ConvertTo-Json)
        Write-Host "[PASS] PATCH /alerts/:id/status" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] PATCH /alerts/:id/status  $($_.ErrorDetails.Message)" -ForegroundColor Red
    }

    # --- DELETE /alerts/:id ---
    try {
        $r = Invoke-RestMethod -Uri "$BASE/alerts/$alertId" -Method DELETE -Headers $H
        Write-Host "[PASS] DELETE /alerts/:id" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] DELETE /alerts/:id  $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# --- Test POST /incidents/:id/timeline with 'message' field ---
try {
    $ir = Invoke-RestMethod -Uri "$BASE/incidents" -Headers $H
    $iid = $ir.data.data[0].id
    $r = Invoke-RestMethod -Uri "$BASE/incidents/$iid/timeline" -Method POST -Headers $H -ContentType "application/json" -Body (@{ message = "timeline test note" } | ConvertTo-Json)
    Write-Host "[PASS] POST /incidents/:id/timeline" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] POST /incidents/:id/timeline  $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# --- Test POST /tickets (no 'type' field - use issueCategory) ---
try {
    $r = Invoke-RestMethod -Uri "$BASE/tickets" -Method POST -Headers $H -ContentType "application/json" -Body (@{
        title         = "Test Ticket"
        description   = "Test ticket description"
        priority      = "low"
        issueCategory = "others"
    } | ConvertTo-Json)
    Write-Host "[PASS] POST /tickets  id=$($r.data.id)" -ForegroundColor Green
    $ticketId = $r.data.id
} catch {
    Write-Host "[FAIL] POST /tickets  $($_.ErrorDetails.Message)" -ForegroundColor Red
    $ticketId = $null
}

if ($ticketId) {
    # --- PATCH /tickets/:id ---
    try {
        $r = Invoke-RestMethod -Uri "$BASE/tickets/$ticketId" -Method PATCH -Headers $H -ContentType "application/json" -Body (@{ status = "in_progress" } | ConvertTo-Json)
        Write-Host "[PASS] PATCH /tickets/:id" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] PATCH /tickets/:id  $($_.ErrorDetails.Message)" -ForegroundColor Red
    }

    # --- POST /tickets/:id/comments (field is 'content' not 'body') ---
    try {
        $r = Invoke-RestMethod -Uri "$BASE/tickets/$ticketId/comments" -Method POST -Headers $H -ContentType "application/json" -Body (@{ content = "test comment" } | ConvertTo-Json)
        Write-Host "[PASS] POST /tickets/:id/comments" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] POST /tickets/:id/comments  $($_.ErrorDetails.Message)" -ForegroundColor Red
    }

    # --- DELETE /tickets/:id ---
    try {
        $r = Invoke-RestMethod -Uri "$BASE/tickets/$ticketId" -Method DELETE -Headers $H
        Write-Host "[PASS] DELETE /tickets/:id" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] DELETE /tickets/:id  $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# --- POST /webhooks/dynatrace/:orgSlug (route needs orgSlug in URL) ---
try {
    $r = Invoke-RestMethod -Uri "$BASE/webhooks/dynatrace/fedex-ito" -Method POST `
        -Headers @{ "X-AlertHive-Secret" = "alerthive-dt-secret-2026" } `
        -ContentType "application/json" `
        -Body (@{
            ProblemTitle    = "CPU High on Web-01"
            ProblemSeverity = "AVAILABILITY"
            PID             = "DT-TEST-001"
            State           = "OPEN"
            ImpactedEntity  = "HOST-web-01"
        } | ConvertTo-Json)
    Write-Host "[PASS] POST /webhooks/dynatrace/:orgSlug" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] POST /webhooks/dynatrace/:orgSlug  $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# --- GET /webhooks/dynatrace/:orgSlug (liveness probe) ---
try {
    $r = Invoke-RestMethod -Uri "$BASE/webhooks/dynatrace/fedex-ito" -Method GET -Headers $H
    Write-Host "[PASS] GET  /webhooks/dynatrace/:orgSlug  $($r.data.message)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] GET  /webhooks/dynatrace/:orgSlug  $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`nDone." -ForegroundColor Cyan
