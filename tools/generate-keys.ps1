# IPTVCloud.app Key Generator for Windows
# Usage: .\tools\generate-keys.ps1

function Generate-RandomString($length) {
    $bytes = New-Object Byte[] $length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_').Replace('=', '')
}

$jwtSecret = Generate-RandomString 64
$apiKey = Generate-RandomString 32

Write-Host ""
Write-Host "--- IPTVCloud.app Security Keys ---" -ForegroundColor Cyan
Write-Host ""
Write-Host "JWT_SECRET:" -NoNewline
Write-Host " $jwtSecret" -ForegroundColor Green
Write-Host "ADMIN_API_KEY:" -NoNewline
Write-Host " $apiKey" -ForegroundColor Green
Write-Host ""
Write-Host "Copy these values into your .env file or Vercel Environment Variables."
Write-Host "Keep these keys secret! If compromised, anyone can sign tokens as admin."
Write-Host ""
