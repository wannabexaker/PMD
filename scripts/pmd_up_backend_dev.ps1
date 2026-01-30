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
    if ($name) { Set-Item -Path "Env:$name" -Value $value }
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

# Determine Mongo host/port from env (defaults to localhost:27017)
$mongoUri = $env:SPRING_DATA_MONGODB_URI
if (-not $mongoUri -or $mongoUri.Trim().Length -eq 0) {
  $mongoUri = 'mongodb://localhost:27017/pmd'
}
$mongoHost = 'localhost'
$mongoPort = 27017
if ($mongoUri -match '^mongodb:\/\/([^\/:]+)(:([0-9]+))?') {
  $mongoHost = $Matches[1]
  if ($Matches[3]) { $mongoPort = [int]$Matches[3] }
}

if ($mongoHost -eq 'localhost' -or $mongoHost -eq '127.0.0.1') {
  if (-not (Test-Port -Port $mongoPort)) {
    Write-Host "Mongo not running on ${mongoHost}:${mongoPort}. Start deps first: scripts\pmd_up_deps.ps1" -ForegroundColor Yellow
    exit 1
  }
} else {
  Write-Host "Mongo host is ${mongoHost}:${mongoPort} (non-local). Skipping local port check." -ForegroundColor DarkYellow
}

if (Test-Port -Port 8099) {
  Write-Host 'Port 8099 already in use. Stop the process or set SERVER_PORT.' -ForegroundColor Yellow
  exit 1
}

if ($env:SPRING_MAIL_HOST -eq 'localhost' -or $env:SPRING_MAIL_HOST -eq '127.0.0.1') {
  $mailPort = 1025
  if ($env:SPRING_MAIL_PORT) { $mailPort = [int]$env:SPRING_MAIL_PORT }
  if (-not (Test-Port -Port $mailPort)) {
    Write-Host "MailHog not running on localhost:${mailPort} (emails won't send)." -ForegroundColor DarkYellow
  }
}

Write-Host 'Starting backend (Spring Boot)...'
Write-Host 'API: http://localhost:8099'

.\mvnw.cmd spring-boot:run
