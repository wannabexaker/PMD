$ErrorActionPreference = 'Stop'

function Write-PmdStep {
  param([string]$Message)
  Write-Host "[PMD] $Message"
}

function Get-PmdRoot {
  return (Split-Path $PSScriptRoot -Parent)
}

function Get-PmdModeFile {
  $root = Get-PmdRoot
  $runtime = Join-Path $root '.runtime'
  if (-not (Test-Path $runtime)) {
    New-Item -ItemType Directory -Path $runtime | Out-Null
  }
  return (Join-Path $runtime 'pmd-active-mode.json')
}

function Get-PmdActiveMode {
  $modeFile = Get-PmdModeFile
  if (-not (Test-Path $modeFile)) { return $null }
  try {
    return (Get-Content $modeFile -Raw | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Set-PmdActiveMode {
  param(
    [Parameter(Mandatory = $true)][string]$Mode,
    [hashtable]$Metadata
  )
  $modeFile = Get-PmdModeFile
  $payload = @{
    mode = $Mode
    updatedAt = (Get-Date).ToString("o")
  }
  if ($Metadata) {
    foreach ($k in $Metadata.Keys) {
      $payload[$k] = $Metadata[$k]
    }
  }
  $payload | ConvertTo-Json -Depth 5 | Set-Content -Path $modeFile
}

function Clear-PmdActiveMode {
  $modeFile = Get-PmdModeFile
  if (Test-Path $modeFile) {
    Remove-Item $modeFile -ErrorAction SilentlyContinue
  }
}

function Test-PmdReviewerRunning {
  try {
    $names = docker ps --filter "name=^/pmd-backend$" --filter "name=^/pmd-frontend$" --format "{{.Names}}"
    return ($null -ne $names -and $names.Count -gt 0)
  } catch {
    return $false
  }
}

function Test-PmdDepsRunning {
  try {
    $names = docker ps --filter "name=^/pmd-mongo$" --filter "name=^/pmd-mailhog$" --format "{{.Names}}"
    return ($null -ne $names -and $names.Count -gt 0)
  } catch {
    return $false
  }
}

function Stop-PmdReviewerStack {
  Write-PmdStep "Stopping reviewer docker stack..."
  try {
    docker compose -f docker-compose.local.yml --profile reviewer down --remove-orphans | Out-Null
  } catch {
    Write-PmdStep "Reviewer stack down returned non-zero; continuing cleanup."
  }
}

function Stop-PmdDepsStack {
  Write-PmdStep "Stopping dependencies docker stack..."
  try {
    docker compose -f docker-compose.deps.yml down --remove-orphans | Out-Null
  } catch {
    Write-PmdStep "Deps stack down returned non-zero; continuing cleanup."
  }
}

function Remove-PmdStoppedNamedContainers {
  $names = @('pmd-mongo', 'pmd-mailhog', 'pmd-backend', 'pmd-frontend')
  foreach ($name in $names) {
    try {
      $id = docker ps -a --filter "name=^/$name$" --filter "status=exited" --format "{{.ID}}"
      if ($id) {
        Write-PmdStep "Removing stale exited container '$name'..."
        docker rm $name | Out-Null
      }
    } catch {
      # best effort cleanup
    }
  }
}

function Remove-PmdNamedContainersForce {
  $names = @('pmd-mongo', 'pmd-mailhog', 'pmd-backend', 'pmd-frontend')
  foreach ($name in $names) {
    try {
      $id = docker ps -a --filter "name=^/$name$" --format "{{.ID}}"
      if ($id) {
        Write-PmdStep "Removing conflicting container '$name'..."
        docker rm -f $name | Out-Null
      }
    } catch {
      # best effort cleanup
    }
  }
}

function Get-PmdBackendJavaPids {
  $pids = @()
  try {
    $javaProcesses = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'java.exe' }
    foreach ($proc in $javaProcesses) {
      $cmd = $proc.CommandLine
      if (-not $cmd) { continue }
      $isPmdRun = ($cmd -match 'com\.pmd\.PmdBackendApplication') -or
        ($cmd -match 'spring-boot:run' -and $cmd -match 'pmd\\backend\\pmd-backend')
      if ($isPmdRun) {
        $pids += [int]$proc.ProcessId
      }
    }
  } catch {
    return @()
  }
  return ($pids | Select-Object -Unique)
}

function Stop-PmdDevProcesses {
  $pidFile = Join-Path $PSScriptRoot ".pmd-dev-pids.json"

  if (Test-Path $pidFile) {
    try {
      $pids = Get-Content $pidFile -Raw | ConvertFrom-Json
      if ($pids.backendPid) {
        Write-PmdStep "Stopping tracked backend process $($pids.backendPid)..."
        Stop-Process -Id $pids.backendPid -Force -ErrorAction SilentlyContinue
      }
      if ($pids.frontendPid) {
        Write-PmdStep "Stopping tracked frontend process $($pids.frontendPid)..."
        Stop-Process -Id $pids.frontendPid -Force -ErrorAction SilentlyContinue
      }
    } catch {
      Write-PmdStep "Could not parse .pmd-dev-pids.json; continuing with process scan."
    } finally {
      Remove-Item $pidFile -ErrorAction SilentlyContinue
    }
  }

  $backendPids = Get-PmdBackendJavaPids
  foreach ($procId in $backendPids) {
    Write-PmdStep "Stopping PMD backend java process $procId..."
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
}

function Ensure-PmdMode {
  param([Parameter(Mandatory = $true)][ValidateSet('dev', 'deps', 'reviewer')][string]$TargetMode)

  Remove-PmdStoppedNamedContainers

  $active = Get-PmdActiveMode
  if ($active -and $active.mode -and $active.mode -ne $TargetMode) {
    Write-PmdStep "Detected previous mode '$($active.mode)'. Cleaning conflicting PMD runtime..."
  }

  if ($TargetMode -eq 'reviewer') {
    Stop-PmdDevProcesses
    Stop-PmdDepsStack
    Remove-PmdNamedContainersForce
    return
  }

  Stop-PmdReviewerStack

  if ($TargetMode -eq 'dev') {
    # Kill stale local PMD backend java instances started outside wrapper.
    $staleBackend = Get-PmdBackendJavaPids
    foreach ($procId in $staleBackend) {
      Write-PmdStep "Stopping stale PMD backend java process $procId..."
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }

  Remove-PmdNamedContainersForce
}
