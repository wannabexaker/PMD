@echo off
setlocal
call "%~dp0..\_compose.bat" up -d mailhog
