$ErrorActionPreference = 'Stop'

Write-Host '[PMD] Building reviewer stack (pull latest base images)...'
docker compose -f docker-compose.local.yml --profile reviewer build --pull

Write-Host '[PMD] Starting reviewer stack (docker compose)...'
docker compose -f docker-compose.local.yml --profile reviewer up -d --force-recreate
docker compose -f docker-compose.local.yml ps
