$blockedRoot = "C:\Projects\PMD"
$cwd = (Get-Location).Path
if ($cwd.StartsWith($blockedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  Write-Error "Refusing to run in $blockedRoot. Use C:\Users\Jiannis\pmd instead."
  exit 2
}

$env:COMPOSE_PROJECT_NAME = "pmd"

docker compose -f docker-compose.local.yml down --remove-orphans
