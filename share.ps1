# Forwarding wrapper to scripts/share.ps1
param([int]$Port = 8000)
& "$PSScriptRoot/scripts/share.ps1" -Port $Port
