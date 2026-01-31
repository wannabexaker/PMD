$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$backendPath = Join-Path $repoRoot 'backend\pmd-backend'
Set-Location $backendPath
 
$runtimeDir = Join-Path $repoRoot '.runtime'
if (-not (Test-Path $runtimeDir)) {
  New-Item -ItemType Directory -Path $runtimeDir | Out-Null
}
$portFile = Join-Path $runtimeDir 'backend-port.txt'

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
    if ($name) { Set-Item -Path ("Env:{0}" -f $name) -Value $value }
  }
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

# Defaults for local dev (can be overridden by .env)
if (-not $env:SPRING_DATA_MONGODB_URI) { $env:SPRING_DATA_MONGODB_URI = 'mongodb://localhost:27017/pmd' }
if (-not $env:SPRING_MAIL_HOST) { $env:SPRING_MAIL_HOST = 'localhost' }
if (-not $env:SPRING_MAIL_PORT) { $env:SPRING_MAIL_PORT = '1025' }
if (-not $env:SPRING_PROFILES_ACTIVE) { $env:SPRING_PROFILES_ACTIVE = 'local' }
if (-not $env:SERVER_PORT) { $env:SERVER_PORT = '0' }
if (-not $env:PMD_RUNTIME_PORT_FILE) { $env:PMD_RUNTIME_PORT_FILE = $portFile }

# Determine Mongo host/port from env (defaults to localhost:27017)
$mongoUri = $env:SPRING_DATA_MONGODB_URI
$mongoHost = 'localhost'
$mongoPort = 27017
if ($mongoUri -match '^mongodb:\/\/([^\/:]+)(:([0-9]+))?') {
  $mongoHost = $Matches[1]
  if ($Matches[3]) { $mongoPort = [int]$Matches[3] }
}

if ($mongoHost -eq 'localhost' -or $mongoHost -eq '127.0.0.1') {
  if (-not (Test-Port -Port $mongoPort)) {
    Write-Host ("Mongo not running on {0}:{1}. Start deps first: scripts\\pmd_up_deps.ps1" -f $mongoHost, $mongoPort) -ForegroundColor Yellow
    exit 1
  }
} else {
  Write-Host ("Mongo host is {0}:{1} (non-local). Skipping local port check." -f $mongoHost, $mongoPort) -ForegroundColor DarkYellow
}

if ($env:SPRING_MAIL_HOST -eq 'localhost' -or $env:SPRING_MAIL_HOST -eq '127.0.0.1') {
  $mailPort = 1025
  if ($env:SPRING_MAIL_PORT) { $mailPort = [int]$env:SPRING_MAIL_PORT }
  if (-not (Test-Port -Port $mailPort)) {
    Write-Host ("MailHog not running on localhost:{0} (emails won't send)." -f $mailPort) -ForegroundColor DarkYellow
  }
}

Write-Host 'Starting backend (Spring Boot)...'
Write-Host 'API: dynamic port (SERVER_PORT=0)'

.\mvnw.cmd spring-boot:run
