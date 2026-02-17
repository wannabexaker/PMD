param(
  [switch]$NoFrontend,
  [switch]$NoBackend,
  [switch]$KeepDeps,
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\pmd_guard.ps1"

function Write-Step($message) {
  Write-Host "[PMD] $message"
}

function Fail($message) {
  Write-Host "[PMD] ERROR: $message" -ForegroundColor Red
  exit 1
}

function Test-Port {
  param([int]$Port)
  try {
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
    return $null -ne $conn
  } catch {
    return $false
  }
}

function Get-HttpStatusCodeFromException {
  param([System.Exception]$Exception)
  if ($null -ne $Exception.Response -and $null -ne $Exception.Response.StatusCode) {
    try { return [int]$Exception.Response.StatusCode } catch { return $null }
  }
  return $null
}

function Wait-Http {
  param([string]$Url, [int]$TimeoutSeconds)
  $start = Get-Date
  while ((Get-Date) -lt $start.AddSeconds($TimeoutSeconds)) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { return $true }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  return $false
}

function Read-BackendPort {
  param(
    [string]$PortFile,
    [int]$TimeoutSeconds,
    [datetime]$MinWriteTime
  )
  $start = Get-Date
  while ((Get-Date) -lt $start.AddSeconds($TimeoutSeconds)) {
    if (Test-Path $PortFile) {
      $item = Get-Item -Path $PortFile -ErrorAction SilentlyContinue
      $lastWrite = if ($item) { $item.LastWriteTime } else { $null }
      $raw = (Get-Content -Path $PortFile -Raw -ErrorAction SilentlyContinue).Trim()
      $lastWriteText = if ($lastWrite) { $lastWrite.ToString("o") } else { "n/a" }
      Write-Host ("[PMD] PortFile: {0} | exists=True | lastWrite={1} | raw='{2}'" -f $PortFile, $lastWriteText, $raw)
      if ($MinWriteTime -and $lastWrite -and $lastWrite -lt $MinWriteTime) {
        Write-Host "[PMD] Port file not updated yet; waiting for a newer write time."
        Start-Sleep -Seconds 1
        continue
      }
      if (-not $raw) {
        Write-Host "[PMD] Invalid port content (empty)."
        Start-Sleep -Seconds 1
        continue
      }
      if ($raw -match '^[0-9]+$') {
        $port = [int]$raw
        if ($port -ge 1 -and $port -le 65535) { return $port }
        Write-Host ("[PMD] Invalid port content (out of range): {0}" -f $raw)
        Start-Sleep -Seconds 1
        continue
      }
      Write-Host ("[PMD] Invalid port content (non-numeric): {0}" -f $raw)
      Start-Sleep -Seconds 1
      continue
    } else {
      Write-Host ("[PMD] PortFile: {0} | exists=False | lastWrite=n/a | raw=''" -f $PortFile)
      Write-Host "[PMD] Port file missing."
    }
    Start-Sleep -Seconds 1
  }
  return $null
}

function Wait-BackendReady {
  param([int]$Port, [int]$TimeoutSeconds)
  $healthUrl = ("http://localhost:{0}/actuator/health" -f $Port)
  $start = Get-Date
  while ((Get-Date) -lt $start.AddSeconds($TimeoutSeconds)) {
    $reason = $null
    try {
      $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3
      $code = [int]$resp.StatusCode
      if ($code -eq 200 -or $code -eq 401 -or $code -eq 403) {
        if ($code -eq 200) {
          try {
            $json = $resp.Content | ConvertFrom-Json
            if ($null -ne $json.status) {
              Write-Host ("[PMD] Health status: '{0}'" -f $json.status)
            }
          } catch {
            Write-Host "[PMD] Health status parse failed (non-fatal)."
          }
        }
        return $true
      }
      if ($code -eq 404) {
        if (Test-Port -Port $Port) { return $true }
        $reason = "health 404; tcp refused"
      } else {
        $reason = ("health {0}" -f $code)
      }
    } catch {
      $statusCode = Get-HttpStatusCodeFromException -Exception $_.Exception
      if ($statusCode -eq 200 -or $statusCode -eq 401 -or $statusCode -eq 403) { return $true }
      if ($statusCode -eq 404) {
        if (Test-Port -Port $Port) { return $true }
        $reason = "health 404; tcp refused"
      } elseif ($statusCode) {
        $reason = ("health {0}" -f $statusCode)
      } else {
        $msg = $_.Exception.Message
        if ($msg -match 'timed out') { $reason = 'http timeout' }
        elseif ($msg -match 'refused') { $reason = 'tcp refused' }
        else { $reason = 'http error' }
      }
    }
    if (-not $reason) {
      if (Test-Port -Port $Port) { return $true }
      $reason = "tcp refused"
    }
    if (-not $reason) { $reason = 'not ready' }
    Write-Host ("[PMD] Backend not ready: {0}. Retrying..." -f $reason)
    Start-Sleep -Seconds 1
  }
  return $false
}

function Test-MongoRunning {
  if (Test-Port -Port 27017) { return $true }
  try {
    $names = docker ps --filter "name=pmd-mongo" --filter "name=mongo" --format "{{.Names}}"
    return ($null -ne $names -and $names.Count -gt 0)
  } catch {
    return $false
  }
}

function Test-MailhogRunning {
  try {
    $lines = docker ps --filter "name=pmd-mailhog" --filter "name=mailhog" --format "{{.Names}}|{{.Ports}}"
    foreach ($line in $lines) {
      if ($line -match "8025->8025" -and $line -match "1025->1025") { return $true }
    }
  } catch {
    return $false
  }
  return $false
}

function Test-FrontendRunning {
  return (Test-Port -Port 5173)
}

$Root = Split-Path $PSScriptRoot -Parent
$runtimeDir = Join-Path $Root '.runtime'
$portFile = Join-Path $Root '.runtime\backend-port.txt'
$pidFile = Join-Path $PSScriptRoot ".pmd-dev-pids.json"

Write-Step "Starting PMD dev (deps + backend + frontend)..."
Ensure-PmdMode -TargetMode 'dev'

Write-Step "Checking Docker..."
try { docker info | Out-Null } catch { Fail "Docker is not running. Start Docker Desktop and retry." }

if (-not $NoFrontend) {
  Write-Step "Checking Node..."
  try { node -v | Out-Null } catch { Fail "Node.js not found. Install Node 18+ and retry." }
}

if (-not $NoBackend) {
  Write-Step "Checking Java..."
  try { java -version | Out-Null } catch { Fail "Java not found. Install Java 21 and retry." }
}

if ($Clean) {
  Write-Step "Clean flag set. Removing deps volumes..."
  docker compose -f docker-compose.local.yml down -v --remove-orphans | Out-Null
}

Write-Step "Checking deps (mongo + mailhog)..."
$mongoRunning = Test-MongoRunning
$mailhogRunning = Test-MailhogRunning

if (-not $mongoRunning -or -not $mailhogRunning) {
  Write-Step "Starting deps (mongo + mailhog)..."
  $services = @()
  if (-not $mongoRunning) { $services += "mongo" }
  if (-not $mailhogRunning) { $services += "mailhog" }
  docker compose -f docker-compose.deps.yml up -d $services | Out-Null
} else {
  Write-Step "Deps already running; skipping start."
}

Write-Step "Waiting for MongoDB..."
if (-not $mongoRunning) {
  $start = Get-Date
  while ((Get-Date) -lt $start.AddSeconds(60)) {
    if (Test-Port -Port 27017) { $mongoRunning = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $mongoRunning) {
    docker compose -f docker-compose.deps.yml ps
    docker compose -f docker-compose.deps.yml logs mongo --tail=200
    Fail "MongoDB did not become ready on localhost:27017."
  }
}

Write-Step "Waiting for MailHog..."
if (-not $mailhogRunning) {
  if (-not (Wait-Http -Url "http://localhost:8025" -TimeoutSeconds 60)) {
    docker compose -f docker-compose.deps.yml ps
    docker compose -f docker-compose.deps.yml logs mailhog --tail=200
    Fail "MailHog did not become ready on http://localhost:8025."
  }
}

$backendPid = $null
$frontendPid = $null
$backendPort = $null

if (-not (Test-Path $runtimeDir)) {
  New-Item -ItemType Directory -Path $runtimeDir | Out-Null
}

if (-not $NoBackend) {
  Write-Step "Starting backend (local)..."
  $backendStartTime = Get-Date
  $backendCmd = @"
Set-Location '$Root\\backend\\pmd-backend';
`$env:SPRING_DATA_MONGODB_URI='mongodb://localhost:27017/pmd';
`$env:SPRING_MAIL_HOST='localhost';
`$env:SPRING_MAIL_PORT='1025';
`$env:SPRING_PROFILES_ACTIVE='local';
`$env:SERVER_PORT='0';
`$env:PMD_RUNTIME_PORT_FILE='$portFile';
.\mvnw.cmd spring-boot:run
"@
  $backendProc = Start-Process powershell -ArgumentList @('-NoExit', '-Command', $backendCmd) -PassThru
  $backendPid = $backendProc.Id
  Write-Step ("Waiting for backend port file at {0}..." -f $portFile)
  $backendPort = Read-BackendPort -PortFile $portFile -TimeoutSeconds 90 -MinWriteTime $backendStartTime
  if (-not $backendPort) {
    Fail "Backend port file not found at $portFile within 90 seconds."
  }
  Write-Step ("Waiting for backend readiness on port {0}..." -f $backendPort)
  if (-not (Wait-BackendReady -Port $backendPort -TimeoutSeconds 60)) {
    Fail ("Backend did not become ready on http://localhost:{0} (health check or TCP)." -f $backendPort)
  }
} else {
  if (Test-Path $portFile) {
    $backendPort = Read-BackendPort -PortFile $portFile -TimeoutSeconds 5 -MinWriteTime ([datetime]::MinValue)
  }
}

if (-not $NoFrontend) {
  Write-Step "Starting frontend (Vite)..."
  $frontendRunning = Test-FrontendRunning
  if (-not $frontendRunning) {
    $backendPortStr = if ($backendPort) { $backendPort.ToString() } else { '' }
    $frontendCmd = @"
Set-Location '$Root\\frontend\\pmd-frontend';
if (!(Test-Path 'node_modules')) { npm ci };
if ('${backendPortStr}' -ne '') { `$env:PMD_BACKEND_PORT = '${backendPortStr}' } elseif (Test-Path '$portFile') { `$env:PMD_BACKEND_PORT = (Get-Content '$portFile' -Raw).Trim() };
npm run dev -- --host 0.0.0.0 --port 5173
"@
    $frontendProc = Start-Process powershell -ArgumentList @('-NoExit', '-Command', $frontendCmd) -PassThru
    $frontendPid = $frontendProc.Id
    Write-Step "Waiting for frontend..."
    if (-not (Wait-Http -Url "http://localhost:5173" -TimeoutSeconds 60)) {
      Fail "Frontend did not become ready on http://localhost:5173."
    }
  } else {
    Write-Step "Frontend already running; skipping start."
  }
}

$pids = @{
  backendPid = $backendPid
  frontendPid = $frontendPid
  startedAt = (Get-Date).ToString("o")
}
$pids | ConvertTo-Json | Set-Content -Path $pidFile
Set-PmdActiveMode -Mode 'dev' -Metadata @{
  backendPid = $backendPid
  frontendPid = $frontendPid
  backendPort = $backendPort
}

Write-Step "Ready:"
Write-Host "  Frontend: http://localhost:5173"
if ($backendPort) {
  Write-Host ("  Backend:  http://localhost:{0}" -f $backendPort)
} else {
  Write-Host "  Backend:  (not started)"
}
Write-Host "  MongoDB:  localhost:27017"
Write-Host "  MailHog:  http://localhost:8025"
Write-Host "  MailHog SMTP: localhost:1025"
Write-Host ("  PortFile: {0}" -f $portFile)
