# Hybrid Local Dev (Deps in Docker, FE/BE local)

Goal
- MongoDB + MailHog run in Docker.
- Backend (Spring Boot) runs locally.
- Frontend (Vite) runs locally.

This is the default local dev workflow. The full dockerized app is still available via `docker-compose.local.yml`.

## 1) Start dependencies (Docker)

```powershell
scripts\pmd-deps-up.ps1
```

Services:
- MongoDB: mongodb://localhost:27017
- MailHog UI: http://localhost:8025

## 2) Start backend locally

```powershell
scripts\pmd-backend-dev.ps1
```

Defaults (override via backend/pmd-backend/.env):
- Mongo: mongodb://localhost:27017/pmd
- MailHog: localhost:1025
- Port: http://localhost:8080

Health check:
- http://localhost:8080/actuator/health

## 3) Start frontend locally

```powershell
scripts\pmd-frontend-dev.ps1
```

Default URL:
- http://localhost:5173

Backend API base (override via frontend/pmd-frontend/.env):
- http://localhost:8080

## 4) One-command dev (deps + FE + BE)

```powershell
scripts\pmd-dev.ps1
```

## Stop/Reset deps

```powershell
scripts\pmd-deps-down.ps1
scripts\pmd-deps-reset.ps1
```

## Notes
- `docker-compose.deps.yml` is for deps only.
- `docker-compose.local.yml` is the full dockerized app path (frontend + backend in containers).

## Sanity checks
- Backend reachable: `curl.exe -s http://localhost:8080/actuator/health`
- Frontend calls backend: login/register should hit http://localhost:8080
- MailHog inbox: http://localhost:8025
