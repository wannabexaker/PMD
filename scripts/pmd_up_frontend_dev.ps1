$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$frontendPath = Join-Path $repoRoot 'frontend\pmd-frontend'
Set-Location $frontendPath

$portFile = Join-Path $repoRoot '.runtime\backend-port.txt'
if (Test-Path $portFile) {
  $port = (Get-Content $portFile | Select-Object -First 1).Trim()
  if ($port) {
    $env:PMD_BACKEND_PORT = $port
  }
} else {
  Write-Host 'Backend port file not found (.runtime\backend-port.txt). Start backend first.' -ForegroundColor Yellow
}

if (-not (Test-Path (Join-Path $frontendPath 'node_modules'))) {
  Write-Host 'node_modules not found, running npm ci...'
  npm ci
}

Write-Host 'Starting frontend (Vite)...'
Write-Host 'Frontend: http://localhost:5173'

npm run dev -- --host 0.0.0.0 --port 5173
