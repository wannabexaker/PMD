@echo off
setlocal
set "ROOT=%~dp0..\.."
pushd "%ROOT%" >nul
set "COMPOSE_FILE=%ROOT%\docker-compose.deps.yml"
docker compose version >nul 2>&1
if errorlevel 1 (
  set "COMPOSE_CMD=docker-compose"
) else (
  set "COMPOSE_CMD=docker compose"
)
%COMPOSE_CMD% -f "%COMPOSE_FILE%" %*
popd >nul
