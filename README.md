# PMD — Project Management Demo

This is a demo project I built to learn and practice full‑stack development.  
It’s a small project management dashboard where you can create projects, assign people, and visualize workload.

## What the app does

PMD is a lightweight project management dashboard with:

- **Projects**: create, edit, update status, archive/restore, delete.
- **Assignments**: assign people to projects with drag & drop and quick actions.
- **People directory**: view users, see their project load, and filter by team.
- **Dashboard**: counts, status breakdowns, and workload charts.
- **Recommendations**: star/recommend people and see who recommended them.
- **Random tools**: pick a random project or randomly assign a person (server‑side logic).

## What it contains (modules)

Frontend (React + Vite):
- Dashboard view with status columns and analytics
- Assign view with 3‑panel layout (projects / available / assigned)
- People directory with stats + widgets
- Auth screens (login / register / confirm email)
- Profile screen

Backend (Spring Boot):
- REST API for projects, users, assignments, stats
- MongoDB persistence
- Basic auth + JWT
- Seed data for demo usage

## Tech stack

- **Frontend**: React, TypeScript, Vite, CSS (no UI framework)
- **Backend**: Java 21, Spring Boot, MongoDB
- **Infra**: Docker + docker‑compose (for local running)

## Run locally (quick start)

### Backend
```
cd backend/pmd-backend
./mvnw spring-boot:run
```

### Frontend
```
cd frontend/pmd-frontend
npm install
npm run dev
```

Defaults:
- Backend runs with the `local` profile (Mongo at `mongodb://localhost:27017/pmd`, port 8099).
- Frontend uses `VITE_API_BASE_URL` if set; otherwise defaults to:
  - `http://localhost:8099` in dev mode
  - `http://localhost:8080` in production build

Optional (override API base for frontend):
```
# in frontend/pmd-frontend/.env.local
VITE_API_BASE_URL=http://localhost:8080
```

## Local development - one command run

Start (one command):
```
scripts\\pmd-start.ps1
```

Status:
```
docker compose -f docker-compose.local.yml ps
```

Logs:
```
docker compose -f docker-compose.local.yml logs --tail=100 backend
```

Clean reset (including volumes):
```
scripts\\pmd-reset.ps1
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- MailHog (email dev inbox): http://localhost:8025
- The compose stack uses the `docker` Spring profile and `PMD_SEED_DEMO=true`, so demo users/projects appear after startup.

## Profiles and ports

- `local` profile (default for `./mvnw spring-boot:run`)
  - `server.port=8099`
  - Mongo: `mongodb://localhost:27017/pmd` (override with `SPRING_DATA_MONGODB_URI`)
  - Stable dev JWT secret from `application-local.yml`
- `docker` profile (compose)
  - `server.port=8080`
  - Mongo: `mongodb://mongo:27017/pmd`
  - Requires `PMD_JWT_SECRET` (>= 32 chars)

## Troubleshooting

Find/kill process using a port (Windows):
```
netstat -ano | findstr :8099
taskkill /PID <pid> /F
```

Override backend port:
```
set SERVER_PORT=8099
./mvnw spring-boot:run
```

Override JWT secret (docker/prod):
```
set PMD_JWT_SECRET=your-32-char-minimum-secret-here
```

## Notes

- This repository is **a demo** made for learning.
- It is not production‑hardened and will evolve as I experiment.

## Notes

- This repository is **a demo** made for learning.
- It is not production-hardened and will evolve as I experiment.
- Do not run docker compose from `C:\Projects\PMD` (read-only clone). Use `C:\Users\Jiannis\pmd` only.
