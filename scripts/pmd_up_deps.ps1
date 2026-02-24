$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\pmd_guard.ps1"

Set-PmdMode -TargetMode 'deps'

Write-Host 'Starting PMD dependencies (MongoDB + MailHog)...'
docker compose -f docker-compose.deps.yml up -d mongo mailhog

Write-Host 'MongoDB: mongodb://localhost:27017'
Write-Host 'MailHog UI: http://localhost:8025'
Set-PmdActiveMode -Mode 'deps' -Metadata @{
  composeFile = 'docker-compose.deps.yml'
}
