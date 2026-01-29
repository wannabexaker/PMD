@echo off
setlocal
for /f "usebackq delims=" %%a in (`docker ps --filter "name=pmd-mongo" --format "{{.Names}}"`) do (
  if /I "%%a"=="pmd-mongo" (
    echo mongo: RUNNING (container pmd-mongo)
    exit /b 0
  )
)
echo mongo: STOPPED (container not running)
