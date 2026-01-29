@echo off
setlocal
netstat -aon | findstr :5173 | findstr LISTENING >nul
if errorlevel 1 (
  echo frontend: STOPPED - port 5173 not listening
) else (
  echo frontend: RUNNING - port 5173 listening
)
