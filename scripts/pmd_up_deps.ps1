$ErrorActionPreference = 'Stop'

Write-Host 'Starting PMD dependencies (MongoDB + MailHog)...'
docker compose -f docker-compose.deps.yml up -d mongo mailhog

Write-Host 'MongoDB: mongodb://localhost:27017'
Write-Host 'MailHog UI: http://localhost:8025'
