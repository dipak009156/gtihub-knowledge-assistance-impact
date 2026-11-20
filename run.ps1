# GitHub Knowledge Assistance (GKA) 1-Click Launcher
$root = $PSScriptRoot
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting GitHub Knowledge Assistance (GKA)           " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Backend API:  http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend App: http://localhost:5173" -ForegroundColor Green
Write-Host ""

Write-Host "[1/2] Starting FastAPI backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "[2/2] Starting Vite React frontend on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev -- --host 0.0.0.0 --port 5173"

Start-Sleep -Seconds 3
Write-Host "Opening http://localhost:5173 in default browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"
Write-Host "Application is live and ready!" -ForegroundColor Green
