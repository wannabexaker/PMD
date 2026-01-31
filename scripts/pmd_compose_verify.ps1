$ErrorActionPreference = 'Stop'

Write-Host '[PMD] Checking backend health...'
curl.exe -s http://localhost:8080/actuator/health | Write-Host

Write-Host '[PMD] Checking frontend UI...'
curl.exe -I http://localhost:5173 | Write-Host

Write-Host '[PMD] Backend logs (last 120)...'
docker compose -f docker-compose.local.yml --profile reviewer logs backend --tail=120

Write-Host '[PMD] Frontend logs (last 120)...'
docker compose -f docker-compose.local.yml --profile reviewer logs frontend --tail=120
