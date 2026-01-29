$ErrorActionPreference = 'Stop'

Write-Host 'Resetting PMD dependencies (removing volumes)...'
docker compose -f docker-compose.deps.yml down -v --remove-orphans
