param(
  [switch]$KeepDeps,
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\pmd_guard.ps1"

Write-PmdStep "Stopping local dev processes..."
Stop-PmdDevProcesses

if (-not $KeepDeps) {
  if (-not (Test-PmdDockerDaemon)) {
    Write-PmdStep "Docker daemon is not available. Skipping dependency shutdown."
    Clear-PmdActiveMode
    Write-PmdStep "Done."
    return
  }
  if ($Clean) {
    Write-PmdStep "Stopping deps and removing volumes..."
    docker compose -f docker-compose.deps.yml down -v --remove-orphans
  } else {
    Write-PmdStep "Stopping deps (mongo + mailhog)..."
    docker compose -f docker-compose.deps.yml down --remove-orphans
  }
} else {
  Write-PmdStep "KeepDeps flag set; leaving mongo/mailhog running."
}

Clear-PmdActiveMode
Write-PmdStep "Done."
