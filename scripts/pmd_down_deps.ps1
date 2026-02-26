$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\pmd_guard.ps1"

Write-Host 'Stopping PMD dependencies...'
if (-not (Test-PmdDockerDaemon)) {
  Write-Host '[PMD] Docker daemon is not available. Nothing to stop for deps.'
  Clear-PmdActiveMode
  return
}
docker compose -f docker-compose.deps.yml down --remove-orphans
Clear-PmdActiveMode
