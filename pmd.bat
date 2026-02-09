@echo off
setlocal
set "ROOT=%~dp0"

if "%~1"=="" goto menu

set "action=%~1"
if /I "%action%"=="up" (
  call "%ROOT%scripts\pmd_dev_up.bat"
  exit /b 0
)
if /I "%action%"=="down" (
  call "%ROOT%scripts\pmd_dev_down.bat"
  exit /b 0
)
if /I "%action%"=="deps" (
  docker start pmd-mongo
  docker start pmd-mailhog
  docker compose -f docker-compose.deps.yml up -d mongo mailhog
  exit /b 0
)
if /I "%action%"=="backend" (
  start "PMD Backend" cmd /k ""%ROOT%scripts\pmd_up_backend_dev.bat""
  exit /b 0
)
if /I "%action%"=="frontend" (
  start "PMD Frontend" cmd /k ""%ROOT%scripts\pmd_up_frontend_dev.bat""
  exit /b 0
)
if /I "%action%"=="status" (
  echo --- Docker deps ---
  docker ps --filter "name=pmd-mongo"
  docker ps --filter "name=pmd-mailhog"
  echo --- Ports ---
  netstat -ano | findstr :8080
  netstat -ano | findstr :5173
  netstat -ano | findstr :27017
  netstat -ano | findstr :8025
  exit /b 0
)
if /I "%action%"=="docker-up" (
  call "%ROOT%scripts\pmd_reviewer_up.bat"
  exit /b 0
)
if /I "%action%"=="docker-down" (
  call "%ROOT%scripts\pmd_reviewer_down.bat"
  exit /b 0
)

echo Usage:

 echo pmd.bat up        ^(start all^)
 echo pmd.bat down      ^(stop all^)
 echo pmd.bat deps      ^(start mongo+mailhog only^)
 echo pmd.bat backend   ^(start backend only^)
 echo pmd.bat frontend  ^(start frontend only^)
 echo pmd.bat status    ^(status^)
 echo pmd.bat docker-up   ^(start full docker stack^)
 echo pmd.bat docker-down ^(stop full docker stack^)
 exit /b 1

:menu
cls
echo PMD Control
echo.
echo [1] Start ALL
echo [2] Stop ALL
echo [3] Start deps (mongo+mailhog)
echo [4] Start backend
echo [5] Start frontend
echo [6] Status
echo [7] Start full docker stack
echo [8] Stop full docker stack
echo.
set /p choice=Select: 

if "%choice%"=="1" call "%ROOT%pmd.bat" up & pause & goto menu
if "%choice%"=="2" call "%ROOT%pmd.bat" down & pause & goto menu
if "%choice%"=="3" call "%ROOT%pmd.bat" deps & pause & goto menu
if "%choice%"=="4" call "%ROOT%pmd.bat" backend & pause & goto menu
if "%choice%"=="5" call "%ROOT%pmd.bat" frontend & pause & goto menu
if "%choice%"=="6" call "%ROOT%pmd.bat" status & pause & goto menu
if "%choice%"=="7" call "%ROOT%pmd.bat" docker-up & pause & goto menu
if "%choice%"=="8" call "%ROOT%pmd.bat" docker-down & pause & goto menu

goto menu
