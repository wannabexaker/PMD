$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\pmd_guard.ps1"

Write-Host '[PMD] Stopping reviewer stack (docker compose)...'
docker compose -f docker-compose.local.yml --profile reviewer down --remove-orphans
Clear-PmdActiveMode
