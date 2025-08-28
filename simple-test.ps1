# GramPulse Authentication Test
Write-Host "Authentication Test Starting..." -ForegroundColor Green

# Generate random phone
$phone = "98" + (Get-Random -Minimum 10000000 -Maximum 99999999)
Write-Host "Testing with phone: $phone" -ForegroundColor Cyan

# Health Check
Write-Host "`nHealth Check..."
$health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
Write-Host "Server Status: $($health.message)" -ForegroundColor Green

# Request OTP
Write-Host "`nRequesting OTP..."
$otpData = @{
    phone = $phone
    name = "Test User"
    village = "Test Village"
} | ConvertTo-Json

$otpResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/request-otp" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $otpData
Write-Host "OTP Request: Success" -ForegroundColor Green

# Get OTP from user
Write-Host "`nCheck server console for OTP"
$otp = Read-Host "Enter OTP"

# Verify OTP  
Write-Host "`nVerifying OTP..."
$verifyData = @{
    phone = $phone
    otp = $otp
} | ConvertTo-Json

$authResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/verify-otp" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $verifyData
$token = $authResponse.data.token
Write-Host "Authentication: Success" -ForegroundColor Green

# Test protected route
Write-Host "`nTesting protected route..."
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$incidents = Invoke-RestMethod -Uri "http://localhost:5000/api/incidents/my" -Method GET -Headers $headers
Write-Host "Protected Route: Success - $($incidents.data.Count) incidents found" -ForegroundColor Green

Write-Host "`nTest completed successfully!" -ForegroundColor Green
Write-Host "User: $phone | OTP: $otp | JWT: Active"
