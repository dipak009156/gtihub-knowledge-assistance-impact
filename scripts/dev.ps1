# PowerShell Local Development Launcher
param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Starting GKA Development Environment    " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Backend API:  http://localhost:$BackendPort" -ForegroundColor Green
Write-Host "Frontend App: http://localhost:$FrontendPort" -ForegroundColor Green
Write-Host "Press Ctrl+C in each terminal to stop." -ForegroundColor Gray
Write-Host ""

$root = Split-Path -Parent $PSScriptRoot

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root/backend'; python -m uvicorn app.main:app --reload --port $BackendPort"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root/frontend'; npm run dev -- --port $FrontendPort"
