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

$verifyDb = "${Database}_verify_" + (Get-Date -Format "yyyyMMddHHmmss")
Write-Host "[PMD] Verifying backup by temporary restore to DB '$verifyDb'..."

docker cp $sourcePath "${ContainerName}:/tmp/pmd-verify" | Out-Null
docker exec $ContainerName mongorestore --drop --db $verifyDb /tmp/pmd-verify/$Database | Out-Null
$count = docker exec $ContainerName mongosh --quiet --eval "db.getSiblingDB('$verifyDb').users.countDocuments()"
docker exec $ContainerName mongosh --quiet --eval "db.getSiblingDB('$verifyDb').dropDatabase()" | Out-Null
docker exec $ContainerName rm -rf /tmp/pmd-verify | Out-Null

Write-Host "[PMD] Restore verification completed. users.count=$count"
