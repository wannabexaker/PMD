@echo off
setlocal
netstat -aon | findstr :8099 | findstr LISTENING >nul
if errorlevel 1 (
  echo backend: STOPPED - port 8099 not listening
) else (
  echo backend: RUNNING - port 8099 listening
)
