$ErrorActionPreference = 'Stop'

Write-Host 'Stopping PMD dependencies...'
docker compose -f docker-compose.deps.yml down --remove-orphans
