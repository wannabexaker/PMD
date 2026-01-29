@echo off
setlocal
netstat -aon | findstr :8080 | findstr LISTENING >nul
if errorlevel 1 (
  echo backend: STOPPED - port 8080 not listening
) else (
  echo backend: RUNNING - port 8080 listening
)
