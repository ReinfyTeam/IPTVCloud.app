# IPTVCloud.app Production Builder & Runner for Windows
# Usage: .\tools\run-prod.ps1

Write-Host "Building Production Bundle..." -ForegroundColor Cyan
npm run build

Write-Host "Starting Production Server..." -ForegroundColor Green
npm run start
