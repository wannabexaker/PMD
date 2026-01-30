$ErrorActionPreference = 'Stop'

Write-Host 'Starting PMD hybrid dev (deps + backend + frontend)...'

& "$PSScriptRoot\pmd_up_deps.ps1"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

Start-Process powershell -ArgumentList @('-NoExit', "-Command", "Set-Location '$repoRoot'; scripts\\pmd_up_backend_dev.ps1")
Start-Process powershell -ArgumentList @('-NoExit', "-Command", "Set-Location '$repoRoot'; scripts\\pmd_up_frontend_dev.ps1")

Write-Host 'Frontend: http://localhost:5173'
Write-Host 'API: http://localhost:8099'
Write-Host 'MailHog UI: http://localhost:8025'
