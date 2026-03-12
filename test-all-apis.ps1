$BASE = "http://localhost:4000/api/v1"
$pass = 0; $fail = 0; $results = @()

function Test-API($label, $method, $path, $body = $null, $hdrs = $null) {
    try {
        $p = @{ Uri = "$BASE$path"; Method = $method; TimeoutSec = 8 }
        if ($hdrs) { $p.Headers = $hdrs }
        if ($body) { $p.Body = ($body | ConvertTo-Json); $p.ContentType = "application/json" }
        $r = Invoke-RestMethod @p
        $script:pass++
        $script:results += [pscustomobject]@{ S = "PASS"; L = $label; D = "ok" }
    } catch {
        $e = ($_.ErrorDetails.Message | ConvertFrom-Json -EA SilentlyContinue)
        $script:fail++
        $msg = if ($e) { $e.error } else { $_.Exception.Message.Substring(0, [Math]::Min(60,$_.Exception.Message.Length)) }
        $script:results += [pscustomobject]@{ S = "FAIL"; L = $label; D = $msg }
    }
}

# ----- HEALTH -----
Test-API "GET  /health" GET "/health"

# ----- AUTH -----
Write-Host "[1/9] Testing AUTH..." -ForegroundColor Cyan
$lr = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body '{"email":"admin@alerthive.com","password":"REDACTED_SEED_PASSWORD","orgSlug":"fedex-ito"}' -ContentType "application/json"
$tok = $lr.data.accessToken
$ref = $lr.data.refreshToken
$H = @{ Authorization = "Bearer $tok" }
Write-Host "      Token acquired: $($tok.Length) chars"
Test-API "POST /auth/login (valid)"     POST "/auth/login"  @{ email = "admin@alerthive.com"; password = "REDACTED_SEED_PASSWORD"; orgSlug = "fedex-ito" }
# Bad credentials should return 401 — we expect FAIL from the try/catch but treat it as PASS
try {
    $p2 = @{ Uri = "$BASE/auth/login"; Method = "POST"; Body = (@{ email = "nobody@nowhere.com"; password = "wrongpass"; orgSlug = "fedex-ito" } | ConvertTo-Json); ContentType = "application/json" }
    Invoke-RestMethod @p2 | Out-Null
    $fail++; $results += [pscustomobject]@{ S = "FAIL"; L = "POST /auth/login (bad creds)"; D = "should have returned 401" }
} catch {
    $e = ($_.ErrorDetails.Message | ConvertFrom-Json -EA SilentlyContinue)
    if ($e -and $e.error -like "*credentials*") {
        $pass++; $results += [pscustomobject]@{ S = "PASS"; L = "POST /auth/login (bad creds)"; D = "correctly rejected" }
    } else {
        $fail++; $results += [pscustomobject]@{ S = "FAIL"; L = "POST /auth/login (bad creds)"; D = "unexpected error" }
    }
}
Test-API "GET  /auth/me"                GET  "/auth/me" -hdrs $H
Test-API "POST /auth/refresh"           POST "/auth/refresh" @{ refreshToken = $ref }
Test-API "POST /auth/logout"            POST "/auth/logout"  @{ refreshToken = $ref } $H

# ----- ALERTS -----
Write-Host "[2/9] Testing ALERTS..." -ForegroundColor Cyan
Test-API "GET  /alerts"               GET  "/alerts" -hdrs $H
$ar = Invoke-RestMethod "$BASE/alerts" -Headers $H
$aid = $ar.data[0].id
Test-API "GET  /alerts/:id"           GET  "/alerts/$aid" -hdrs $H
Test-API "POST /alerts"               POST "/alerts" @{ title = "API-Test Alert"; message = "automated test message"; priority = "high"; source = "test-runner" } $H
$newAlert = $null
try { $newAlert = Invoke-RestMethod "$BASE/alerts" -Method POST -Headers $H -ContentType "application/json" -Body (@{ title = "StatusTest"; message = "status test"; priority = "low"; source = "t" } | ConvertTo-Json) } catch { $newAlert = $null }
if ($newAlert) {
    Test-API "PATCH /alerts/:id/status"  PATCH "/alerts/$($newAlert.data.id)/status" @{ status = "acknowledged" } $H
    Test-API "DELETE /alerts/:id"        DELETE "/alerts/$($newAlert.data.id)" -hdrs $H
} else {
    $fail++; $results += [pscustomobject]@{ S = "FAIL"; L = "PATCH /alerts/:id/status"; D = "skipped (create failed)" }
    $fail++; $results += [pscustomobject]@{ S = "FAIL"; L = "DELETE /alerts/:id"; D = "skipped (create failed)" }
}

# ----- INCIDENTS -----
Write-Host "[3/9] Testing INCIDENTS..." -ForegroundColor Cyan
Test-API "GET  /incidents"              GET  "/incidents" -hdrs $H
$ir = Invoke-RestMethod "$BASE/incidents" -Headers $H
$iid = $ir.data[0].id
Test-API "GET  /incidents/:id"          GET  "/incidents/$iid" -hdrs $H
Test-API "POST /incidents"              POST "/incidents" @{ title = "API-Test Inc"; description = "test inc"; priority = "medium"; alertIds = @() } $H
$newInc = Invoke-RestMethod "$BASE/incidents" -Method POST -Headers $H -Body '{"title":"StatusInc","description":"x","priority":"low","alertIds":[]}' -ContentType "application/json"
Test-API "PATCH /incidents/:id/status"  PATCH "/incidents/$($newInc.data.id)/status" @{ status = "identified"; note = "testing" } $H
Test-API "POST /incidents/:id/timeline" POST  "/incidents/$($newInc.data.id)/timeline" @{ message = "timeline entry test" } $H

# ----- TICKETS -----
Write-Host "[4/9] Testing TICKETS..." -ForegroundColor Cyan
Test-API "GET  /tickets"              GET  "/tickets" -hdrs $H
$tkr = Invoke-RestMethod "$BASE/tickets" -Headers $H
$tkid = $tkr.data[0].id
Test-API "GET  /tickets/:id"          GET  "/tickets/$tkid" -hdrs $H
Test-API "POST /tickets"              POST "/tickets" @{ title = "API-Test Ticket"; description = "test ticket"; priority = "low"; issueCategory = "others" } $H
$newTk = Invoke-RestMethod "$BASE/tickets" -Method POST -Headers $H -ContentType "application/json" -Body (@{ title = "CommentTicket"; description = "comment ticket test"; priority = "low"; issueCategory = "others" } | ConvertTo-Json)
Test-API "PATCH /tickets/:id"         PATCH "/tickets/$($newTk.data.id)" @{ status = "in_progress" } $H
Test-API "POST /tickets/:id/comments" POST  "/tickets/$($newTk.data.id)/comments" @{ content = "automated test comment" } $H
Test-API "DELETE /tickets/:id"        DELETE "/tickets/$($newTk.data.id)" -hdrs $H

# ----- USERS -----
Write-Host "[5/9] Testing USERS..." -ForegroundColor Cyan
Test-API "GET  /users"                GET  "/users" -hdrs $H
$ur = Invoke-RestMethod "$BASE/users" -Headers $H
$uid = $ur.data[0].id
Test-API "GET  /users/:id"            GET  "/users/$uid" -hdrs $H
$rnd = Get-Random -Maximum 99999
Test-API "POST /users (admin)"        POST "/users" @{ email = "testuser$rnd@test.com"; password = "test1234!"; name = "Test User $rnd"; role = "developer" } $H
$newU = Invoke-RestMethod "$BASE/users" -Method POST -Headers $H -Body "{`"email`":`"patchtest$rnd@test.com`",`"password`":`"pass1234!`",`"name`":`"Patch Test`",`"role`":`"developer`"}" -ContentType "application/json"
Test-API "PATCH /users/:id (admin)"   PATCH "/users/$($newU.data.id)" @{ name = "Patch Test Updated" } $H
Test-API "DELETE /users/:id (admin)"  DELETE "/users/$($newU.data.id)" -hdrs $H

# ----- ANALYTICS -----
Write-Host "[6/9] Testing ANALYTICS..." -ForegroundColor Cyan
Test-API "GET  /analytics/alerts"        GET  "/analytics/alerts" -hdrs $H
Test-API "GET  /analytics/tickets"       GET  "/analytics/tickets" -hdrs $H
Test-API "GET  /analytics/top-resolvers" GET  "/analytics/top-resolvers" -hdrs $H
Test-API "POST /analytics/email-report"  POST "/analytics/email-report" @{ email = "test@test.com" } $H

# ----- SLA -----
Write-Host "[7/9] Testing SLA..." -ForegroundColor Cyan
Test-API "GET  /sla"                GET "/sla" -hdrs $H
Test-API "PUT  /sla/critical"       PUT "/sla/critical" @{ responseTimeMinutes = 15; resolutionTimeMinutes = 60; escalateAfterMinutes = 30; description = "P1 Critical" } $H
Test-API "PUT  /sla/high"           PUT "/sla/high" @{ responseTimeMinutes = 30; resolutionTimeMinutes = 240; escalateAfterMinutes = 60; description = "P2 High" } $H

# ----- WEBHOOKS -----
Write-Host "[8/9] Testing WEBHOOKS..." -ForegroundColor Cyan
# Webhook routes require :orgSlug in the URL — no auth header, uses X-AlertHive-Secret
# No secret → expect 401 (correct rejection)
try {
    Invoke-RestMethod -Uri "$BASE/webhooks/dynatrace/fedex-ito" -Method POST -ContentType "application/json" -Body (@{ ProblemTitle="NoSec"; ProblemSeverity="AVAILABILITY"; PID="DT-NOSEC"; State="OPEN" } | ConvertTo-Json) | Out-Null
    $fail++; $results += [pscustomobject]@{ S = "FAIL"; L = "POST /webhooks/dynatrace (no secret)"; D = "should have rejected" }
} catch {
    $e2 = ($_.ErrorDetails.Message | ConvertFrom-Json -EA SilentlyContinue)
    if ($e2 -and $e2.error -like "*secret*") {
        $pass++; $results += [pscustomobject]@{ S = "PASS"; L = "POST /webhooks/dynatrace (no secret)"; D = "correctly rejected 401" }
    } else {
        $fail++; $results += [pscustomobject]@{ S = "FAIL"; L = "POST /webhooks/dynatrace (no secret)"; D = if($e2){$e2.error}else{"unknown"} }
    }
}
# With correct secret → expect 201
Test-API "POST /webhooks/dynatrace (with secret)" POST "/webhooks/dynatrace/fedex-ito" @{ ProblemTitle = "Webhook OK Test"; ProblemSeverity = "AVAILABILITY"; PID = "DT-$(Get-Random)"; State = "OPEN"; ImpactedEntity = "HOST-01" } @{ "X-AlertHive-Secret" = "alerthive-dt-secret-2026" }
# GET liveness probe
Test-API "GET  /webhooks/dynatrace/fedex-ito (probe)" GET "/webhooks/dynatrace/fedex-ito" -hdrs $H

# ----- AUTH LOGOUT (done last so token works through all tests) -----
Write-Host "[9/9] Done." -ForegroundColor Cyan

# ----- RESULTS -----
Write-Host ""
Write-Host "============================================================"
Write-Host "   ALERTHIVE API TEST RESULTS   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "============================================================"
$results | ForEach-Object {
    $color = if ($_.S -eq "PASS") { "Green" } else { "Red" }
    Write-Host ("[{0}] {1,-48} {2}" -f $_.S, $_.L, $_.D) -ForegroundColor $color
}
Write-Host "------------------------------------------------------------"
$totalColor = if ($fail -eq 0) { "Green" } else { "Yellow" }
Write-Host "  PASSED: $pass   FAILED: $fail   TOTAL: $($pass + $fail)" -ForegroundColor $totalColor
Write-Host "============================================================"
