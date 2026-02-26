$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\pmd_guard.ps1"

if (-not (Test-PmdDockerDaemon)) {
  Write-PmdStep "Docker daemon is not available. Start Docker Desktop and try again."
  exit 1
}

Set-PmdMode -TargetMode 'deps'

Write-Host 'Starting PMD dependencies (MongoDB + MailHog)...'
docker compose -f docker-compose.deps.yml up -d mongo mailhog

Write-Host 'MongoDB: mongodb://localhost:27017'
Write-Host 'MailHog UI: http://localhost:8025'
Set-PmdActiveMode -Mode 'deps' -Metadata @{
  composeFile = 'docker-compose.deps.yml'
}
