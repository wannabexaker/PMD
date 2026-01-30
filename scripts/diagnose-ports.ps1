Param(
  [string]$EnvFile = ".env"
)

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
  Write-Host "`n$Label ($Port)"
  $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
  if (-not $conns) {
    Write-Host "  FREE"
    return
  }
  $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    $proc = tasklist /FI "PID eq $pid" | Select-Object -Last 1
    Write-Host "  PID $pid -> $proc"
  }
}

Write-Host "PMD port diagnostics (env: $EnvFile)"
Show-Port -Port $ports.PMD_BACKEND_PORT -Label "Backend (dockerized)"
if ($ports.PMD_BACKEND_PORT -ne 8099) {
  Show-Port -Port 8099 -Label "Backend (hybrid local)"
}
Show-Port -Port $ports.PMD_FRONTEND_PORT -Label "Frontend"
Show-Port -Port $ports.PMD_MONGO_PORT -Label "Mongo"
Show-Port -Port $ports.PMD_SMTP_PORT -Label "SMTP"
Show-Port -Port $ports.PMD_MAILHOG_UI_PORT -Label "MailHog UI"
