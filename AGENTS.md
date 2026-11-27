# AGENTS.md — PMD

Instructions for AI coding sessions working in this repository. Read this first.

## What PMD is

PMD (Project Management Dashboard) is a workspace-based project management web app: workspaces,
teams, roles, projects, assignments, comments, an audit log, and GDPR export/erasure.

**It is a demo.** Live frontend: <https://pmd.olamov.com> (Vercel). API:
<https://api-pmd.olamov.com> (a Raspberry Pi behind a Cloudflare Tunnel). Part of Olamov.

**The backend is stopped on the Pi on purpose** (owner's decision, 2026-11-20 — no users).
The frontend detects this and shows a "demo — backend is offline" notice on the auth screens.
**Do not start it** unless the owner asks. When asked: `docker start pmd-mongo-1 pmd-backend-1`.

## Stack and layout

| Path | What |
| --- | --- |
| `backend/pmd-backend/` | Spring Boot 4, Java 21, Maven (`mvnw`). Packages under `com.pmd.*` by domain (`auth`, `workspace`, `project`, `audit`, `privacy`, `upload`, …). |
| `frontend/pmd-frontend/` | React 19 + TypeScript + Vite, npm (`package-lock.json`). |
| `docs/` | Runbooks and architecture notes. `docs/legal/` holds the live Terms and Privacy Policy. |
| `scripts/` | Windows dev helpers (`.ps1`/`.bat`) and `scripts/pi/admin-mode.sh`. |
| `.scratch/` | Gitignored working files (plans, notes, rescued archives). See its `README.md`. |

Database: MongoDB. **Production is pinned to `mongo:4.4.18`** — the last version that runs on the
Pi 4's ARMv8.0 CPU (5.0+ needs ARMv8.2 atomics and crashes). Dev and CI use `mongo:7`. Keep every
query and aggregation compatible with a 4.4 server; there are no transactions (standalone mongod).

## Architecture in production

```
browser → pmd.olamov.com (Vercel SPA)
            rewrites /api, /uploads, /actuator → api-pmd.olamov.com
              → host Cloudflare Tunnel on the Pi → backend on 127.0.0.1:8080 → Mongo (internal network)
```

The Pi runs one host-level Cloudflare Tunnel for all projects; it maps `api-pmd.olamov.com` to
`http://localhost:8080`. The compose files define no tunnel service of their own.

## Running it locally

```bash
docker compose -f docker-compose.deps.yml up -d        # mongo:7 + mailhog
cd backend/pmd-backend && ./mvnw spring-boot:run        # profile "local" by default, port 8080
cd frontend/pmd-frontend && npm ci && npm run dev       # http://localhost:5173
```

The Vite dev server proxies `/api`, `/actuator` and `/uploads` to the backend port
(`PMD_BACKEND_PORT`, else `.runtime/backend-port.txt`, else 8080). The Windows launcher
`scripts/pmd.bat` (PMD Control) wraps the same steps.

## Checks before committing

```bash
cd frontend/pmd-frontend && npm run lint && npm run typecheck && npm run test
cd backend/pmd-backend && ./mvnw test   # integration tests need Mongo on localhost:27017
```

Backend integration tests share a persistent local Mongo; drop the `pmd` database first for a run
that matches CI. CI (`.github/workflows/ci.yml`) runs compose validation, frontend lint/test and
backend tests. `release.yml` builds and pushes `ghcr.io/wannabexaker/pmd-{frontend,backend}:latest`
on every push to `main`; it does not deploy to the Pi.

## Deploying to the Pi

`docker-compose.pi.yml` in this repo is the source of truth. It fixes the project name
(`name: pmd`) and reads secrets from a `.env` next to it, which compose loads by itself.

**Target layout** (`~/projects/pmd`, one `.env`):

```bash
cd ~/projects/pmd
docker compose -f docker-compose.pi.yml pull backend
docker compose -f docker-compose.pi.yml up -d backend
curl -fsS http://127.0.0.1:8080/actuator/health
```

**Today the Pi still uses the old layout** — `~/pmd`, secrets in `.env.production`, its own older
copy of the compose file — so there you still need `--env-file .env.production`. The one-time
move, and what has to be added to the env file first (`PMD_SECURITY_ADMIN_EMAILS`), is in
`docs/OPERATIONS.md`. It is the owner's call; do not apply it unasked.

Platform admin is granted on demand with `scripts/pi/admin-mode.sh on|off|status`.

## Things that bite

- **Indexes come only from `DatabaseMigrationRunner`.** The custom `MongoTemplate` disables
  annotation-driven index creation, so `@Indexed` does nothing. Add new indexes as a new migration.
- **`docs/legal/*.md` is user-visible.** The `/terms` and `/privacy` pages import it at build time
  (`?raw`). No internal notes or `[TO BE …]` markers in those files; internal notes go in
  `docs/legal/README.md`. The frontend Docker image therefore builds from the repo root.
- **CSP lives in two places** — `frontend/pmd-frontend/vercel.json` and `nginx.conf`. Keep them in
  lockstep; `img-src` must allow `blob:` or avatar cropping breaks.
- **Deploy stacks fail fast on missing secrets** (`${VAR:?}`). A new required variable must also be
  added to the compose validation step in `ci.yml` and to the `.env*.example` files.
- Comment attachments are disabled (`PMD_UPLOADS_ATTACHMENTS_ENABLED=false`) and uploads are
  rate-limited per account — the Pi's SD card is the constraint.

## Rules

- **No `Co-Authored-By` or "Generated with" lines** in commits or PR descriptions. One commit per fix.
- Working files go in `.scratch/`, never in the repo root.
- Never print secrets (`.env*`, JWT secret, hash salt, tunnel token) to output or commit them.
- Destructive production actions — wiping data, restarting services — only when the owner
  explicitly asks for that specific action.
- The owner writes in Greek: reply in Greek, keep code and technical terms in English.

## Further reading

In the repo: `docs/OPERATIONS.md` (Pi runbook: layout, move, backups), `docs/PRODUCTION_ARCHITECTURE.md`,
`docs/PRODUCTION_BACKUP_RESTORE_RUNBOOK.md`
(aspirational — no backups are scheduled yet), `docs/db-runbook.md`, `docs/legal/README.md`.

Local only (gitignored, present on the owner's machine): `docs/DEPLOY_OLAMOV.md` (the go-live
runbook) and `.scratch/2026-11-20-from-netsentry-proposed-fixes.md` (the shared direction for all
projects).
