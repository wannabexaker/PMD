param(
    [string]$ContainerName = "pmd-mongo",
    [string]$Database = "pmd",
    [string]$OutputDir = ".runtime\db-backups"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is required."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $OutputDir "$Database-$timestamp"
New-Item -ItemType Directory -Force -Path $backupPath | Out-Null

Write-Host "[PMD] Creating Mongo backup for '$Database' from container '$ContainerName'..."
docker exec $ContainerName mongodump --db $Database --out /tmp/pmd-backup | Out-Null
docker cp "${ContainerName}:/tmp/pmd-backup/$Database" $backupPath | Out-Null
docker exec $ContainerName rm -rf /tmp/pmd-backup | Out-Null

Write-Host "[PMD] Backup completed: $backupPath\$Database"
