$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$frontendPath = Join-Path $repoRoot 'frontend\pmd-frontend'
Set-Location $frontendPath

if (-not (Test-Path (Join-Path $frontendPath 'node_modules'))) {
  Write-Host 'node_modules not found, running npm ci...'
  npm ci
}

Write-Host 'Starting frontend (Vite)...'
Write-Host 'Frontend: http://localhost:5173'

npm run dev
