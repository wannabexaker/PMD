$ErrorActionPreference = 'Stop'

function Write-Step($message) {
  Write-Host "[PMD] $message"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$runtimeDir = Join-Path $repoRoot '.runtime'
if (-not (Test-Path $runtimeDir)) {
  New-Item -ItemType Directory -Path $runtimeDir | Out-Null
}
$portFile = Join-Path $runtimeDir 'backend-port.txt'

Write-Step 'Starting deps (mongo + mailhog)...'
docker compose -f docker-compose.deps.yml up -d

Write-Step 'Starting backend (local)...'
Start-Process powershell -ArgumentList @('-NoExit', '-Command', "$PSScriptRoot\\pmd_up_backend_dev.ps1") | Out-Null

Write-Step 'Waiting for backend port file...'
$start = Get-Date
while ((Get-Date) -lt $start.AddSeconds(60)) {
  if (Test-Path $portFile) {
    $port = (Get-Content $portFile | Select-Object -First 1).Trim()
    if ($port) { break }
  }
  Start-Sleep -Seconds 2
}

Write-Step 'Starting frontend (Vite)...'
Start-Process powershell -ArgumentList @('-NoExit', '-Command', "$PSScriptRoot\\pmd_up_frontend_dev.ps1") | Out-Null

Write-Step 'Dev mode started.'
Write-Host 'Frontend: http://localhost:5173'
Write-Host 'MailHog:  http://localhost:8025'
