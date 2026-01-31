param(
  [switch]$KeepDeps,
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'

function Write-Step($message) {
  Write-Host "[PMD] $message"
}

$pidFile = Join-Path $PSScriptRoot ".pmd-dev-pids.json"
if (Test-Path $pidFile) {
  try {
    $pids = Get-Content $pidFile | ConvertFrom-Json
    if ($pids.backendPid) {
      Write-Step "Stopping backend process $($pids.backendPid)..."
      Stop-Process -Id $pids.backendPid -Force -ErrorAction SilentlyContinue
    }
    if ($pids.frontendPid) {
      Write-Step "Stopping frontend process $($pids.frontendPid)..."
      Stop-Process -Id $pids.frontendPid -Force -ErrorAction SilentlyContinue
    }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
  } catch {
    Write-Step "Failed to read pid file; manual cleanup may be required."
  }
} else {
  Write-Step "No pid file found. Skipping process cleanup."
}

if (-not $KeepDeps) {
  if ($Clean) {
    Write-Step "Stopping deps and removing volumes..."
    docker compose -f docker-compose.deps.yml down -v --remove-orphans
  } else {
    Write-Step "Stopping deps (mongo + mailhog)..."
    docker compose -f docker-compose.deps.yml stop mongo mailhog
  }
} else {
  Write-Step "KeepDeps flag set; leaving mongo/mailhog running."
}

Write-Step "Done."
