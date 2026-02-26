$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\pmd_guard.ps1"

if (-not (Test-PmdDockerDaemon)) {
  Write-PmdStep "Docker daemon is not available. Start Docker Desktop and try again."
  exit 1
}

Set-PmdMode -TargetMode 'reviewer'

Write-Host '[PMD] Building reviewer stack (pull latest base images)...'
docker compose -f docker-compose.local.yml --profile reviewer build --pull

Write-Host '[PMD] Starting reviewer stack (docker compose)...'
docker compose -f docker-compose.local.yml --profile reviewer up -d --force-recreate
docker compose -f docker-compose.local.yml ps
Set-PmdActiveMode -Mode 'reviewer' -Metadata @{
  composeFile = 'docker-compose.local.yml'
}
