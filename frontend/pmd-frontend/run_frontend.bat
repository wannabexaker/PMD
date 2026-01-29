@echo off
setlocal
pushd "%~dp0"
call npm run dev
if errorlevel 1 pause
popd
