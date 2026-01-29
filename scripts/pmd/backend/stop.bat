@echo off
setlocal
taskkill /F /T /FI "WINDOWTITLE eq PMD Backend" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
  taskkill /F /PID %%a >nul 2>&1
)
