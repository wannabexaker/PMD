$ErrorActionPreference = 'Stop'

Write-Host '[PMD] Starting reviewer stack (docker compose)...'
docker compose -f docker-compose.local.yml --profile reviewer up -d --build
docker compose -f docker-compose.local.yml ps
