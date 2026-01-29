$blockedRoot = "C:\Projects\PMD"
$cwd = (Get-Location).Path
if ($cwd.StartsWith($blockedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  Write-Error "Refusing to run in $blockedRoot. Use C:\Users\Jiannis\pmd instead."
  exit 2
}

$env:COMPOSE_PROJECT_NAME = "pmd"

$preflight = Join-Path $PSScriptRoot "preflight.ps1"
if (Test-Path $preflight) {
  & $preflight
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

docker compose -f docker-compose.local.yml up -d --build

docker compose -f docker-compose.local.yml ps

Write-Host ""
Write-Host "URLs:"
Write-Host "- Frontend: http://localhost:$($env:PMD_FRONTEND_PORT ?? 5173)"
Write-Host "- Backend:  http://localhost:$($env:PMD_BACKEND_PORT ?? 8080)/actuator/health"
Write-Host "- MailHog:  http://localhost:$($env:PMD_MAILHOG_UI_PORT ?? 8025)"
