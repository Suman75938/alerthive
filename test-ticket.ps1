$BASE = "http://localhost:4000/api/v1"
$lr = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email='admin@alerthive.com';password='REDACTED_SEED_PASSWORD';orgSlug='fedex-ito'} | ConvertTo-Json) -ContentType "application/json"
$H = @{ Authorization = "Bearer $($lr.data.accessToken)" }

# Check GET /sla to see org context
$sla = Invoke-RestMethod -Uri "$BASE/sla" -Headers $H
Write-Host "SLA policies: $($sla.data.Count)"
Write-Host "First SLA severity: $($sla.data[0].severity)  orgId: $($sla.data[0].orgId)"

# Check GET /auth/me to see orgId
$me = Invoke-RestMethod -Uri "$BASE/auth/me" -Headers $H
Write-Host "Me orgId: $($me.data.orgId)"

# Test simplest possible ticket creation
try {
    Write-Host "Attempting ticket create..."
    $body = @{
        title       = "Simple Test"
        description = "Simple desc"
        priority    = "medium"
    }
    $r = Invoke-RestMethod -Uri "$BASE/tickets" -Method POST -Headers $H -ContentType "application/json" -Body ($body | ConvertTo-Json)
    Write-Host "SUCCESS: $($r.data.id)"
} catch {
    Write-Host "ERROR: $($_.ErrorDetails.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}
