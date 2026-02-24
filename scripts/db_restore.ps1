param(
    [string]$ContainerName = "pmd-mongo",
    [string]$Database = "pmd",
    [Parameter(Mandatory = $true)][string]$BackupFolder
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFolder)) {
    throw "Backup folder not found: $BackupFolder"
}

$sourcePath = Join-Path $BackupFolder $Database
if (-not (Test-Path $sourcePath)) {
    throw "Expected backup path '$sourcePath' not found."
}

Write-Host "[PMD] Restoring database '$Database' from '$sourcePath' to '$ContainerName'..."
docker cp $sourcePath "${ContainerName}:/tmp/pmd-restore" | Out-Null
docker exec $ContainerName mongorestore --drop --db $Database /tmp/pmd-restore/$Database | Out-Null
docker exec $ContainerName rm -rf /tmp/pmd-restore | Out-Null

Write-Host "[PMD] Restore completed."
