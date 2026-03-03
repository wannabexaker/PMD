Param(
  [string]$ComposeFile = "docker-compose.prod.yml"
)

$ErrorActionPreference = "Stop"

Write-Host "[PMD] Verifying production attack surface from compose: $ComposeFile"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker CLI not found."
  exit 1
}

$configJson = docker compose -f $ComposeFile config --format json
if (-not $configJson) {
  Write-Error "Failed to render compose config."
  exit 1
}

$cfg = $configJson | ConvertFrom-Json
$bad = @()

foreach ($svcProp in $cfg.services.PSObject.Properties) {
  $service = $svcProp.Name
  $ports = @($svcProp.Value.ports)
  foreach ($p in $ports) {
    if (-not $p) { continue }
    $target = [int]$p.target
    if ($target -eq 8080 -or $target -eq 27017) {
      $bad += "$service publishes internal port $target"
    }
  }
}

if ($bad.Count -gt 0) {
  Write-Host "[PMD] FAIL: Internal services are exposed:"
  $bad | ForEach-Object { Write-Host " - $_" }
  exit 2
}

Write-Host "[PMD] PASS: Backend (8080) and MongoDB (27017) are not published in production compose."
exit 0
