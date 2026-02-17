$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\pmd_guard.ps1"

Write-Host 'Stopping PMD dependencies...'
docker compose -f docker-compose.deps.yml down --remove-orphans
Clear-PmdActiveMode
