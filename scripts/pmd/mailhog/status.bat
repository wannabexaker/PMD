@echo off
setlocal
for /f "usebackq delims=" %%a in (`docker ps --filter "name=pmd-mailhog" --format "{{.Names}}"`) do (
  if /I "%%a"=="pmd-mailhog" (
    echo mailhog: RUNNING (container pmd-mailhog)
    exit /b 0
  )
)
echo mailhog: STOPPED (container not running)
