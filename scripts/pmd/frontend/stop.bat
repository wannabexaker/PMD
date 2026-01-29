@echo off
setlocal
taskkill /F /T /FI "WINDOWTITLE eq PMD Frontend" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
  taskkill /F /PID %%a >nul 2>&1
)
