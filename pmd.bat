@echo off
setlocal
set "ROOT=%~dp0"
if "%~1"=="" goto menu

set "action=%~1"
set "target=%~2"
if /I "%action%"=="start" goto dispatch
if /I "%action%"=="stop" goto dispatch
if /I "%action%"=="status" goto dispatch
if /I "%action%"=="clear" goto dispatch

echo Usage: pmd.bat ^<start^|stop^|status^|clear^> ^<backend^|frontend^|mongo^|mailhog^|all^>
exit /b 1

:dispatch
if /I "%action%"=="clear" if "%target%"=="" set "target=all"
if /I "%target%"=="backend" (
  if /I "%action%"=="start" goto start_backend
  if /I "%action%"=="clear" call "%ROOT%scripts\pmd\backend\stop.bat" & exit /b 0
  call "%ROOT%scripts\pmd\backend\%action%.bat" & exit /b 0
)
if /I "%target%"=="frontend" (
  if /I "%action%"=="start" goto start_frontend
  if /I "%action%"=="clear" call "%ROOT%scripts\pmd\frontend\stop.bat" & exit /b 0
  call "%ROOT%scripts\pmd\frontend\%action%.bat" & exit /b 0
)
if /I "%target%"=="mongo" (
  if /I "%action%"=="clear" call "%ROOT%scripts\pmd\mongo\stop.bat" & exit /b 0
  call "%ROOT%scripts\pmd\mongo\%action%.bat" & exit /b 0
)
if /I "%target%"=="mailhog" (
  if /I "%action%"=="clear" call "%ROOT%scripts\pmd\mailhog\stop.bat" & exit /b 0
  call "%ROOT%scripts\pmd\mailhog\%action%.bat" & exit /b 0
)
if /I "%target%"=="all" goto all

echo Unknown target: %target%
exit /b 1

:all
if /I "%action%"=="start" (
  call "%ROOT%scripts\pmd\mongo\start.bat"
  call "%ROOT%scripts\pmd\mailhog\start.bat"
  start "PMD Backend" cmd /k "\"%ROOT%scripts\pmd\backend\start.bat\""
  start "PMD Frontend" cmd /k "\"%ROOT%scripts\pmd\frontend\start.bat\""
  exit /b 0
)
if /I "%action%"=="stop" (
  call "%ROOT%scripts\pmd\frontend\stop.bat"
  call "%ROOT%scripts\pmd\backend\stop.bat"
  call "%ROOT%scripts\pmd\mailhog\stop.bat"
  call "%ROOT%scripts\pmd\mongo\stop.bat"
  exit /b 0
)
if /I "%action%"=="status" (
  call "%ROOT%scripts\pmd\mongo\status.bat"
  call "%ROOT%scripts\pmd\mailhog\status.bat"
  call "%ROOT%scripts\pmd\backend\status.bat"
  call "%ROOT%scripts\pmd\frontend\status.bat"
  exit /b 0
)
if /I "%action%"=="clear" (
  call "%ROOT%scripts\pmd\frontend\stop.bat"
  call "%ROOT%scripts\pmd\backend\stop.bat"
  call "%ROOT%scripts\pmd\mailhog\stop.bat"
  call "%ROOT%scripts\pmd\mongo\stop.bat"
  exit /b 0
)
exit /b 0

:menu
cls
echo PMD Control
echo.
echo [1] Start backend
echo [2] Start frontend
echo [3] Start mongo
echo [4] Start mailhog
echo.
echo [5] Stop backend
echo [6] Stop frontend
echo [7] Stop mongo
echo [8] Stop mailhog
echo.
echo [9] Status backend
echo [10] Status frontend
echo [11] Status mongo
echo [12] Status mailhog
echo.
echo [13] Start ALL
echo [14] Stop ALL
echo [15] Status ALL
echo [16] Clear ALL (soft)
echo.
set /p choice=Select: 

if "%choice%"=="1" call "%ROOT%pmd.bat" start backend & pause & goto menu
if "%choice%"=="2" call "%ROOT%pmd.bat" start frontend & pause & goto menu
if "%choice%"=="3" call "%ROOT%scripts\pmd\mongo\start.bat" & pause & goto menu
if "%choice%"=="4" call "%ROOT%scripts\pmd\mailhog\start.bat" & pause & goto menu
if "%choice%"=="5" call "%ROOT%scripts\pmd\backend\stop.bat" & pause & goto menu
if "%choice%"=="6" call "%ROOT%scripts\pmd\frontend\stop.bat" & pause & goto menu
if "%choice%"=="7" call "%ROOT%scripts\pmd\mongo\stop.bat" & pause & goto menu
if "%choice%"=="8" call "%ROOT%scripts\pmd\mailhog\stop.bat" & pause & goto menu
if "%choice%"=="9" call "%ROOT%scripts\pmd\backend\status.bat" & pause & goto menu
if "%choice%"=="10" call "%ROOT%scripts\pmd\frontend\status.bat" & pause & goto menu
if "%choice%"=="11" call "%ROOT%scripts\pmd\mongo\status.bat" & pause & goto menu
if "%choice%"=="12" call "%ROOT%scripts\pmd\mailhog\status.bat" & pause & goto menu
if "%choice%"=="13" call "%ROOT%pmd.bat" start all & pause & goto menu
if "%choice%"=="14" call "%ROOT%pmd.bat" stop all & pause & goto menu
if "%choice%"=="15" call "%ROOT%pmd.bat" status all & pause & goto menu
if "%choice%"=="16" call "%ROOT%pmd.bat" clear all & pause & goto menu

goto menu

:start_backend
start "PMD Backend" cmd /k ""%ROOT%scripts\pmd\backend\start.bat""
exit /b 0

:start_frontend
start "PMD Frontend" cmd /k ""%ROOT%scripts\pmd\frontend\start.bat""
exit /b 0
