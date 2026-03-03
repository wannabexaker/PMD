Param(
  [string]$FrontendBase = "http://localhost",
  [string]$ApiHealthPath = "/actuator/health",
  [switch]$CheckPortExposure
)

$ErrorActionPreference = "Stop"
$failures = @()

function Test-Url {
  param(
    [string]$Url,
    [string]$Name
  )
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 10
    if ($resp.StatusCode -lt 200 -or $resp.StatusCode -ge 400) {
      $script:failures += "$Name returned HTTP $($resp.StatusCode)"
    } else {
      Write-Host "[PASS] $Name"
    }
  } catch {
    $script:failures += "$Name failed: $($_.Exception.Message)"
  }
}

Test-Url -Url "$FrontendBase/" -Name "Frontend root"
Test-Url -Url "$FrontendBase$ApiHealthPath" -Name "Backend health via reverse proxy"

if ($CheckPortExposure) {
  $listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue
  $has8080 = $listeners | Where-Object { $_.LocalPort -eq 8080 }
  $has27017 = $listeners | Where-Object { $_.LocalPort -eq 27017 }
  if ($has8080) { $failures += "Port 8080 is listening on host." }
  if ($has27017) { $failures += "Port 27017 is listening on host." }
  if (-not $has8080 -and -not $has27017) {
    Write-Host "[PASS] Internal ports are not listening on host (8080/27017)."
  }
}

if ($failures.Count -gt 0) {
  Write-Host "[FAIL] Readiness check failed:"
  $failures | ForEach-Object { Write-Host " - $_" }
  exit 1
}

Write-Host "[PASS] Readiness check completed successfully."
