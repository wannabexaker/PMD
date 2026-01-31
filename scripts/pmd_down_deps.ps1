$ErrorActionPreference = 'Stop'

Write-Host 'Stopping PMD dependencies...'
docker compose -f docker-compose.deps.yml stop mongo mailhog
