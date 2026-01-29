$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$backendPath = Join-Path $repoRoot 'backend\pmd-backend'
Set-Location $backendPath

# Load .env if present
$envFile = Join-Path $backendPath '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $parts = $line.Split('=', 2)
    if ($parts.Count -ne 2) { return }
    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')
    if ($name) { $env:$name = $value }
  }
}

Write-Host 'Starting backend (Spring Boot)...'
Write-Host 'API: http://localhost:8080'

.\mvnw.cmd spring-boot:run
