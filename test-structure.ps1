$BASE = "http://localhost:4000/api/v1"
$lr = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email='admin@alerthive.com';password='REDACTED_SEED_PASSWORD';orgSlug='fedex-ito'} | ConvertTo-Json) -ContentType "application/json"
$H = @{ Authorization = "Bearer $($lr.data.accessToken)" }

# Check alerts response
$ar = Invoke-RestMethod "$BASE/alerts" -Headers $H
Write-Host "=== ALERTS ==="
Write-Host "ar.data type:           $($ar.data.GetType().Name)"
Write-Host "ar.data[0].id:          $($ar.data[0].id)"
Write-Host "ar.data.Count:          $($ar.data.Count)"
Write-Host ""

# Check incidents response
$ir = Invoke-RestMethod "$BASE/incidents" -Headers $H
Write-Host "=== INCIDENTS ==="
Write-Host "ir.data type:           $($ir.data.GetType().Name)"
Write-Host "ir.data[0].id:          $($ir.data[0].id)"
Write-Host "ir.data.Count:          $($ir.data.Count)"
Write-Host ""

# Check tickets response
$tkr = Invoke-RestMethod "$BASE/tickets" -Headers $H
Write-Host "=== TICKETS ==="
Write-Host "tkr.data type:          $($tkr.data.GetType().Name)"
Write-Host "tkr.data[0].id:         $($tkr.data[0].id)"
Write-Host "tkr.data.Count:         $($tkr.data.Count)"
