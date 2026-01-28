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
- Backend runs with the `local` profile (Mongo at `mongodb://localhost:27017/pmd`).
- Frontend uses `VITE_API_BASE_URL` if set, otherwise `http://localhost:8080`.

Optional (override API base for frontend):
```
# in frontend/pmd-frontend/.env.local
VITE_API_BASE_URL=http://localhost:8080
```

## Local development - one command run

Start (one command):
```
docker compose -f docker-compose.local.yml up -d
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
docker compose -f docker-compose.local.yml down --remove-orphans -v
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- MailHog (email dev inbox): http://localhost:8025
- The compose stack uses the `docker` Spring profile and `PMD_SEED_DEMO=true`, so demo users/projects appear after startup.

## Notes

- This repository is **a demo** made for learning.
- It is not production‑hardened and will evolve as I experiment.
