$ErrorActionPreference = 'Stop'

Write-Host 'Starting PMD hybrid dev (deps + backend + frontend)...'

& "$PSScriptRoot\pmd-deps-up.ps1"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

Start-Process powershell -ArgumentList @('-NoExit', "-Command", "Set-Location '$repoRoot'; scripts\\pmd-backend-dev.ps1")
Start-Process powershell -ArgumentList @('-NoExit', "-Command", "Set-Location '$repoRoot'; scripts\\pmd-frontend-dev.ps1")

Write-Host 'Frontend: http://localhost:5173'
Write-Host 'API: http://localhost:8080'
Write-Host 'MailHog UI: http://localhost:8025'
