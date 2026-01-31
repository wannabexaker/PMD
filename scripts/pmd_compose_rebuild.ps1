$ErrorActionPreference = 'Stop'

Write-Host '[PMD] Bringing stack down (volumes)...'
docker compose -f docker-compose.local.yml --profile reviewer down -v --remove-orphans

Write-Host '[PMD] Building images --no-cache...'
docker compose -f docker-compose.local.yml --profile reviewer build --no-cache

Write-Host '[PMD] Starting stack...'
docker compose -f docker-compose.local.yml --profile reviewer up -d

Write-Host '[PMD] Current services:'
docker compose -f docker-compose.local.yml ps
