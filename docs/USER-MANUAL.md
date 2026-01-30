# PMD User Manual

This manual explains the PMD run modes, exact ports, and the approved start/stop/status/reset/debug flows.
It is written to avoid port conflicts and make troubleshooting deterministic.

## Index
1. Overview
2. Run modes
3. Port map (single source of truth)
4. Quick start (hybrid dev)
5. Dockerized app (compose local)
6. Scripts reference (start/stop/status/reset)
7. Health + status checks
8. Debug workflow (backend, frontend, database, mail)
9. Common errors and fixes

---

## 1) Overview
PMD can run in two main modes:
- Hybrid dev (recommended): Frontend + Backend run locally; MongoDB + MailHog run in Docker.
- Dockerized app: All services run in Docker via docker-compose.local.yml.

We keep ports explicit and consistent so you always know what is running where.

---

## 2) Run modes

### A) Hybrid dev (recommended)
- Frontend: Vite dev server (local)
- Backend: Spring Boot (local, profile: local)
- MongoDB + MailHog: Docker deps only

Why: fastest feedback for FE/BE changes, clear ports, minimal conflicts.

### B) Dockerized app (compose local)
- Frontend + Backend + Mongo + MailHog in Docker
- Useful for reviewer-style full-container runs

---

## 3) Port map (single source of truth)

### Hybrid dev
- Frontend: http://localhost:5173
- Backend:  http://localhost:8099
- MongoDB:  localhost:27017
- MailHog SMTP: localhost:1025
- MailHog UI:  http://localhost:8025

Flow: Frontend -> Backend (8099), Backend -> Mongo (27017), Backend -> SMTP (1025).

### Dockerized app (docker-compose.local.yml)
- Frontend: http://localhost:5173 (container :80)
- Backend:  http://localhost:8080 (container :8080)
- MongoDB:  localhost:27017
- MailHog SMTP: localhost:1025
- MailHog UI:  http://localhost:8025

If port 8080 is taken on your machine, set `.env` in repo root:
```
PMD_BACKEND_PORT=8099
```
Then restart compose.

---

## 4) Quick start (hybrid dev)

### Start dependencies (Mongo + MailHog)
```
scripts\pmd_up_deps.ps1
```

### Start backend (local)
```
scripts\pmd_up_backend_dev.ps1
```

### Start frontend (local)
```
scripts\pmd_up_frontend_dev.ps1
```

### One-command dev (deps + backend + frontend)
```
scripts\pmd_up_dev.bat
```

---

## 5) Dockerized app (compose local)

Start full stack:
```
docker compose -f docker-compose.local.yml up -d --build
```

Stop:
```
docker compose -f docker-compose.local.yml down --remove-orphans
```

Reset (includes volumes):
```
docker compose -f docker-compose.local.yml down -v --remove-orphans
```

---

## 6) Scripts reference (start/stop/status/reset)

### Hybrid dev scripts
- `scripts\pmd_up_deps.ps1` : start Mongo + MailHog (Docker deps)
- `scripts\pmd_down_deps.ps1` : stop deps
- `scripts\pmd_reset_deps.ps1` : reset deps (drop volumes)
- `scripts\pmd_up_backend_dev.ps1` : start backend locally (port 8099)
- `scripts\pmd_up_frontend_dev.ps1` : start frontend locally (port 5173)
- `scripts\pmd_up_dev.bat` : start deps + backend + frontend

### Legacy menu scripts (optional)
These are simple .bat wrappers under `scripts\pmd\...` and are aligned to the same ports.
Use them only if you prefer the older menu flow.

---

## 7) Health + status checks

### Backend health
```
curl.exe -s http://localhost:8099/actuator/health
```

### Docker deps status
```
docker compose -f docker-compose.deps.yml ps
```

### Port conflicts
```
scripts\diagnose-ports.ps1
```

### Check listeners (Windows)
```
netstat -ano | findstr :8099
netstat -ano | findstr :5173
netstat -ano | findstr :27017
netstat -ano | findstr :1025
netstat -ano | findstr :8025
```

---

## 8) Debug workflow

### Backend
- Start backend and watch console logs.
- Confirm Mongo connection: no `Connection refused` for localhost:27017.
- Health endpoint must be UP.

### Frontend
- Check console log shows API base URL.
- Login/register should hit backend port 8099 in dev.

### Database
- If backend says Mongo connection refused, ensure deps are running:
  `scripts\pmd_up_deps.ps1`

### Mail
- Open MailHog UI: http://localhost:8025
- Test email flows there.

---

## 9) Common errors and fixes

1) Backend says Mongo connection refused
- Cause: deps not running.

Note: backend script stops early if Mongo is not listening.
- Fix: run `scripts\pmd_up_deps.ps1` first.

2) Frontend cannot reach backend
- Cause: wrong API base URL or backend not running.
- Fix: ensure backend is on 8099 and set
  `VITE_API_BASE_URL=http://localhost:8099` in `frontend/pmd-frontend/.env`.

3) Port 8080 already used (dockerized mode)
- Cause: Windows service (svchost) or another app.
- Fix: set `PMD_BACKEND_PORT=8099` in repo root `.env` and restart compose.

---

If you want this manual extended with screenshots or a troubleshooting decision tree, say the word.
