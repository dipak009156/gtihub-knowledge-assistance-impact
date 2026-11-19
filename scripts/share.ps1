# PowerShell Share Helper
param([int]$Port = 8000)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  GitHub Knowledge Assistance Share Link  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$dockerRunning = $false
try {
    $null = docker info 2>$null
    if ($LASTEXITCODE -eq 0) { $dockerRunning = $true }
}
catch {}

if ($dockerRunning) {
    Write-Host "Docker is active! Launching app and Cloudflare Tunnel container..." -ForegroundColor Green
    docker compose up -d --build
    Start-Sleep -Seconds 4
    Write-Host ""
    Write-Host "Your live public share link from Cloudflare Tunnel:" -ForegroundColor Cyan
    docker compose logs tunnel | Select-String "https://.*\.trycloudflare\.com"
    Write-Host ""
    Write-Host "Share the https://...trycloudflare.com link with your friends!" -ForegroundColor Green
}
else {
    Write-Host "Docker Desktop daemon is not currently active." -ForegroundColor Yellow
    Write-Host "Opening an instant public tunnel for 127.0.0.1:$Port to share with friends..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C when you want to stop sharing." -ForegroundColor Gray
    Write-Host ""
    ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:$Port nokey@localhost.run
}
