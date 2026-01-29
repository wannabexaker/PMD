Param(
  [string]$EnvFile = ".env"
)

$blockedRoot = "C:\Projects\PMD"
$cwd = (Get-Location).Path
if ($cwd.StartsWith($blockedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  Write-Error "Refusing to run in $blockedRoot. Use C:\Users\Jiannis\pmd instead."
  exit 2
}

$defaults = @{
  PMD_BACKEND_PORT = 8080
  PMD_FRONTEND_PORT = 5173
  PMD_MONGO_PORT = 27017
  PMD_SMTP_PORT = 1025
  PMD_MAILHOG_UI_PORT = 8025
}

$ports = $defaults.Clone()
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
      $parts = $line.Split("=", 2)
      $key = $parts[0].Trim()
      $value = $parts[1].Trim()
      if ($ports.ContainsKey($key) -and $value) {
        $ports[$key] = [int]$value
      }
    }
  }
}

function Show-Port {
  param(
    [int]$Port,
    [string]$Label
  )
  $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
  if (-not $conns) {
    Write-Host "[OK] $Label ($Port) is free."
    return $true
  }
  Write-Host "[BLOCKED] $Label ($Port) is in use."
  $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    $proc = tasklist /FI "PID eq $pid" | Select-Object -Last 1
    Write-Host "  PID $pid -> $proc"
  }
  return $false
}

$ok = $true
$ok = (Show-Port -Port $ports.PMD_BACKEND_PORT -Label "Backend") -and $ok
$ok = (Show-Port -Port $ports.PMD_FRONTEND_PORT -Label "Frontend") -and $ok
$ok = (Show-Port -Port $ports.PMD_MONGO_PORT -Label "Mongo") -and $ok
$ok = (Show-Port -Port $ports.PMD_SMTP_PORT -Label "SMTP") -and $ok
$ok = (Show-Port -Port $ports.PMD_MAILHOG_UI_PORT -Label "MailHog UI") -and $ok

if (-not $ok) {
  Write-Host ""
  Write-Host "Resolve port conflicts or override ports in .env (PMD_*_PORT)."
  exit 1
}

exit 0
