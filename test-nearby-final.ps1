Write-Host "Testing Nearby Issues Endpoint" -ForegroundColor Yellow

# Step 1: Request OTP
Write-Host "Requesting OTP..." -ForegroundColor Cyan
$otpRequest = @{
    phone = "5121212121"
    name = "Test User"
    village = "Test Village"
} | ConvertTo-Json

$otpResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/request-otp" -Method POST -Body $otpRequest -ContentType "application/json"
$otp = $otpResponse.otp
Write-Host "OTP received: $otp" -ForegroundColor Green

# Step 2: Verify OTP and login
Write-Host "Verifying OTP..." -ForegroundColor Cyan
$loginData = @{
    phone = "5121212121"
    otp = $otp
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/verify-otp" -Method POST -Body $loginData -ContentType "application/json"
$token = $loginResponse.data.token
Write-Host "Login successful, token obtained" -ForegroundColor Green

# Step 3: Test endpoints
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Testing my issues..." -ForegroundColor Cyan
$myResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/incidents/my" -Method GET -Headers $headers
Write-Host "My issues count: $($myResponse.data.Count)" -ForegroundColor White

Write-Host "Testing nearby issues..." -ForegroundColor Cyan
$nearbyResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/incidents/nearby?lat=9.086915&lng=76.4883702" -Method GET -Headers $headers
Write-Host "Nearby issues count: $($nearbyResponse.data.Count)" -ForegroundColor White

# Analysis
if ($myResponse.data.Count -gt 0 -and $nearbyResponse.data.Count -eq 0) {
    Write-Host "PROBLEM FOUND: My issues exist but nearby shows none!" -ForegroundColor Red
    Write-Host "This means the nearby endpoint logic is broken" -ForegroundColor Red
} elseif ($nearbyResponse.data.Count -gt 0) {
    Write-Host "Nearby issues working correctly" -ForegroundColor Green
    foreach ($issue in $nearbyResponse.data) {
        Write-Host "  - $($issue.title) (Status: $($issue.status))" -ForegroundColor White
    }
} else {
    Write-Host "No issues found in either endpoint" -ForegroundColor Yellow
}
