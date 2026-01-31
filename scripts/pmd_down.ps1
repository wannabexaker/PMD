$ErrorActionPreference = 'Stop'

Write-Host '[PMD] Stopping local dev processes and deps...'
& "$PSScriptRoot\\pmd_dev_down.ps1"
