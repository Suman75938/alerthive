$BASE = "http://localhost:4000/api/v1"
$lr = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email='admin@alerthive.com';password='REDACTED_SEED_PASSWORD';orgSlug='fedex-ito'} | ConvertTo-Json) -ContentType "application/json"
$H = @{ Authorization = "Bearer $($lr.data.accessToken)" }

# Check incident response structure  
$ir = Invoke-RestMethod -Uri "$BASE/incidents" -Headers $H
Write-Host "Incident response keys:" ($ir | Get-Member -MemberType NoteProperty).Name
Write-Host "ir.data type:" $ir.data.GetType().Name
Write-Host "ir.data keys:" ($ir.data | Get-Member -MemberType NoteProperty).Name
Write-Host "ir.data.data[0].id:" $ir.data.data[0].id
Write-Host ""

# Also test POST /tickets with verbose error
try {
    $body = @{
        title         = "Test Ticket"
        description   = "Test ticket description"
        priority      = "low"
        issueCategory = "others"
    }
    Write-Host "Posting ticket body:" ($body | ConvertTo-Json)
    $r = Invoke-RestMethod -Uri "$BASE/tickets" -Method POST -Headers $H -ContentType "application/json" -Body ($body | ConvertTo-Json)
    Write-Host "PASS: ticket id=$($r.data.id)"
} catch {
    Write-Host "FAIL: $($_.ErrorDetails.Message)"
    Write-Host "Exception: $($_.Exception.Message)"
}
