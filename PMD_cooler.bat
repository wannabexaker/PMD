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
  call "%ROOT%scripts\pmd_up_deps.bat"
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
if /I "%action%"=="ops" (
  start "PMD Ops" powershell -NoExit -ExecutionPolicy Bypass -Command "python \"%ROOT%scripts\pmdops.py\""
  exit /b 0
)
echo Usage:
echo pmd.bat up        (start all)
echo pmd.bat down      (stop all)
echo pmd.bat deps      (start mongo+mailhog only)
echo pmd.bat backend   (start backend only)
echo pmd.bat frontend  (start frontend only)
echo pmd.bat status    (status)
echo pmd.bat docker-up   (start full docker stack)
echo pmd.bat docker-down (stop full docker stack)
echo pmd.bat ops       (open PMD Ops cockpit)
exit /b 1
:menu
cls
color 0A
echo.
echo  ======================================================================
echo   PPPPP   M   M  DDDD
echo   P   P   MM MM  D   D
echo   PPPPP   M M M  D   D
echo   P       M   M  D   D
echo   P       M   M  DDDD
echo  ======================================================================
echo  [*] PROJECT MANAGEMENT DASHBOARD - DEV CONTROL PANEL
echo  [*] System ready for deployment...
echo  ======================================================================
echo.
echo  [1] ^> START ALL SERVICES
echo  [2] ^> STOP ALL SERVICES
echo  [3] ^> START DEPENDENCIES (MongoDB + Mailhog)
echo  [4] ^> START BACKEND SERVER
echo  [5] ^> START FRONTEND SERVER
echo  [6] ^> SYSTEM STATUS CHECK
echo  [7] ^> START FULL DOCKER STACK
echo  [8] ^> STOP FULL DOCKER STACK
echo  [9] ^> OPEN PMD OPS COCKPIT
echo  [0] ^> EXIT
echo.
echo  ======================================================================
set /p choice=[+] Select option: 
if "%choice%"=="1" call "%ROOT%pmd.bat" up & pause & goto menu
if "%choice%"=="2" call "%ROOT%pmd.bat" down & pause & goto menu
if "%choice%"=="3" call "%ROOT%pmd.bat" deps & pause & goto menu
if "%choice%"=="4" call "%ROOT%pmd.bat" backend & pause & goto menu
if "%choice%"=="5" call "%ROOT%pmd.bat" frontend & pause & goto menu
if "%choice%"=="6" call "%ROOT%pmd.bat" status & pause & goto menu
if "%choice%"=="7" call "%ROOT%pmd.bat" docker-up & pause & goto menu
if "%choice%"=="8" call "%ROOT%pmd.bat" docker-down & pause & goto menu
if "%choice%"=="9" call "%ROOT%pmd.bat" ops & pause & goto menu
if "%choice%"=="0" exit /b 0
goto menu
