# PMD — Project Management Dashboard

A web app for running small-team projects: create a workspace, invite people, split them into teams with roles, and track projects, assignments and comments, with an audit trail of who changed what. Users can export or erase their own data (GDPR).

**Live demo:** <https://pmd.olamov.com>. It is a demo with no real users, so its backend is usually switched off; the site then says so instead of failing at sign-in.

## Overview

Full-stack application combining a React/Vite frontend, a Spring Boot REST API, and MongoDB. In production the frontend is on Vercel and the API runs on a Raspberry Pi behind a Cloudflare Tunnel (see [docs/OPERATIONS.md](docs/OPERATIONS.md)). For local development on Windows, a double-click batch launcher (PMD Control) handles service orchestration, health checks, and dynamic port assignment. Docker provides MongoDB and MailHog for development; the same stack can run fully containerized for review.

## Features

- Workspace-based project and task management with role-based access
- JWT access tokens (15-minute lifetime) with cookie-based rotating refresh sessions
- `POST /api/auth/logout-all` revokes all active sessions for a user
- CSRF double-submit protection on all cookie-auth endpoints
- Rate limiting per IP and per user (configurable via env vars)
- Email notifications for workspace invite, join request, and approval events — throttled and digest-grouped per user preference
- Append-only audit log with hash-chain fields (`prevEventHash`, `eventHash`) for tamper evidence
- Platform admin interface at `/admin` for cross-workspace governance
- CI database gates: `DatabaseIndexGateTest` and `DatabaseContractGateTest` verify indexes and schema contract before merge
- The Pi deploy stack (`docker-compose.pi.yml`) fails fast if a required secret is missing

## Architecture

The backend starts with `SERVER_PORT=0` (OS-assigned port) and writes the selected port to `.runtime/backend-port.txt`. The frontend reads this via `PMD_BACKEND_PORT` and proxies `/api`, `/actuator`, and `/uploads` to the backend. In reviewer/Docker mode, the frontend Nginx container handles that proxying instead.

PMD Control enforces a single active runtime mode (`dev`, `deps`, or `reviewer`) tracked in `.runtime/pmd-active-mode.json`. Starting one mode stops conflicting services from other modes.

### Components

| Component | Role |
|---|---|
| `frontend/pmd-frontend/` | React 19 + Vite SPA |
| `backend/pmd-backend/` | Spring Boot REST API |
| `docker-compose.deps.yml` | MongoDB + MailHog for hybrid dev |
| `docker-compose.local.yml` | Full reviewer stack — all services in Docker with Nginx proxy |
| `docker-compose.pi.yml` | Production stack on the Raspberry Pi: backend + MongoDB, fail-fast on missing secrets |
| `scripts/pmd.bat` | PMD Control launcher — entry point for all dev operations |
| `scripts/pmd_dev_up.bat` | Starts deps, backend (dynamic port), and frontend; waits for health |
| `scripts/pmd_dev_down.bat` | Stops Maven/Node processes via `.pmd-dev-pids.json` |
| `scripts/db_backup.ps1` | Local MongoDB backup helper |
| `scripts/pi/` | Pi helpers: `admin-mode.sh`, `backup.sh` (prepared, not scheduled) |
| `.runtime/` | Runtime state (port file, active mode, PID list) — gitignored |

## Tech Stack

| Technology | Role |
|---|---|
| React 19 | Frontend SPA |
| Vite 7 | Frontend dev server and bundler |
| TypeScript 5.9 | Frontend type safety |
| React Router v6 | Client-side routing |
| Spring Boot | Backend REST API |
| MongoDB | Primary database |
| MailHog | Local SMTP testing |
| Docker / Docker Compose | Dependency containers and reviewer stack |
| Nginx | Frontend reverse proxy in Docker mode |
| Windows batch scripts | Dev orchestration (PMD Control) |

## Installation

```bash
git clone https://github.com/wannabexaker/PMD
cd PMD
cp .env.example .env
```

Edit `.env` with your local values. The Pi deployment uses `.env.pi.example` as its template (see `docs/OPERATIONS.md`).

Docker must be running before starting any PMD mode.

## Usage

```
scripts\pmd.bat
```

Opens PMD Control. Select `[1] Start ALL` to bring up MongoDB, MailHog, backend, and frontend. The script waits for all health checks before printing the ready URLs.

```
scripts\pmd.bat up        # start everything (non-interactive)
scripts\pmd.bat down      # stop everything
scripts\pmd.bat deps      # start MongoDB + MailHog only
scripts\pmd.bat status    # print service status
```

For the full Docker reviewer stack:

```bash
docker compose -f docker-compose.local.yml --profile reviewer up -d --build
```

| Service | Local URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:<dynamic>` (see `.runtime/backend-port.txt`) |
| MongoDB | `mongodb://localhost:27017/pmd` |
| MailHog UI | `http://localhost:8025` |

## Project Structure

```
PMD/
├── frontend/
│   └── pmd-frontend/          — React + Vite SPA
├── backend/
│   └── pmd-backend/           — Spring Boot API
├── scripts/
│   ├── pmd.bat                — PMD Control entry point
│   ├── pmd_dev_up.bat         — start all services
│   ├── pmd_dev_down.bat       — stop all services
│   ├── db_backup.ps1          — MongoDB backup
│   ├── db_restore.ps1         — MongoDB restore
│   └── pi/                    — Pi helpers (admin mode, backup)
├── docs/
│   ├── OPERATIONS.md          — Pi runbook
│   ├── db-runbook.md
│   ├── error-contract.md
│   └── legal/                 — Terms and Privacy Policy (shown in the app)
├── .runtime/                  — runtime state (gitignored)
├── docker-compose.deps.yml    — MongoDB + MailHog
├── docker-compose.local.yml   — full reviewer stack
├── docker-compose.pi.yml      — production stack (Raspberry Pi)
├── .env.example               — dev env template
└── .env.pi.example            — Pi env template
```

## Notes

The dynamic backend port (`SERVER_PORT=0`) avoids conflicts when other services occupy common ports. The `.runtime/backend-port.txt` file is the contract between the backend and the frontend startup script; never hardcode a port in `.env` for local dev.

`PMD_SECURITY_TRUST_PROXY_HEADERS` defaults to `false`. Set it to `true` only when the application runs behind a trusted reverse proxy — enabling it on an internet-facing host without a proxy leaks real client IP from spoofed headers.

Client metadata (IP, user-agent) is anonymized at storage time by default. Raw storage is opt-in via `PMD_SECURITY_CLIENT_METADATA_STORE_RAW`.

The Pi stack (`docker-compose.pi.yml`) refuses to start if a required secret is missing. The backend is published on `127.0.0.1:8080` only, for the host-level Cloudflare Tunnel; MongoDB is not published at all.
