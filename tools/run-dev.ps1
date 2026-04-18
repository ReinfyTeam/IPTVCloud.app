# IPTVCloud.app Development Runner for Windows
# Usage: .\tools\run-dev.ps1

Write-Host "Initializing Development Environment..." -ForegroundColor Cyan
npm run db:dev
npm run dev
