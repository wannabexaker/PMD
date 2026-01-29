@echo off
setlocal
pushd "%~dp0"
call mvnw.cmd spring-boot:run -e
if errorlevel 1 pause
popd
