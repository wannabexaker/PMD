$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\pmd_guard.ps1"

Write-Host '[PMD] Stopping reviewer stack (docker compose)...'
if (-not (Test-PmdDockerDaemon)) {
  Write-Host '[PMD] Docker daemon is not available. Nothing to stop for reviewer stack.'
  Clear-PmdActiveMode
  return
}
docker compose -f docker-compose.local.yml --profile reviewer down --remove-orphans
Clear-PmdActiveMode
