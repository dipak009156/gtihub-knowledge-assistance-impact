# PowerShell Test Runner for Backend and Frontend
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Running Full Project Test Suite         " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$root = Split-Path -Parent $PSScriptRoot

Write-Host "--> Running Backend Unit & Regression Tests (pytest)..." -ForegroundColor Yellow
Push-Location "$root/backend"
python -m pytest tests/
$backendExit = $LASTEXITCODE
Pop-Location

if ($backendExit -ne 0) {
    Write-Host "Backend tests failed with exit code $backendExit" -ForegroundColor Red
    exit $backendExit
}

Write-Host ""
Write-Host "--> Running Frontend Vitest Component Suite..." -ForegroundColor Yellow
Push-Location "$root/frontend"
npx vitest run
$frontendExit = $LASTEXITCODE
Pop-Location

if ($frontendExit -ne 0) {
    Write-Host "Frontend tests failed with exit code $frontendExit" -ForegroundColor Red
    exit $frontendExit
}

Write-Host ""
Write-Host "All backend and frontend tests passed successfully!" -ForegroundColor Green
