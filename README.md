# PMD - Project Management Dashboard


## Product planning source

Use `PRD.md` as the single source of truth for requirements, TODOs, and progress history.

PMD is a Windows-friendly hybrid development playground for a lightweight project management workspace. It ships with a React/Vite frontend, a Spring Boot + MongoDB backend, and Docker helpers for MongoDB/MailHog, and the scripts (_PMD Control_) take care of wiring everything together so you can always start with a double-click.

## Recommended workflow - PMD Control

1. **Double-click `PMD.bat` (root of the repo)** to open **PMD Control**.
2. Select **[1] Start ALL**. The batch script runs `scripts\pmd_dev_up.bat`, which:
   - Ensures Docker (Mongo + MailHog) is running through `docker compose -f docker-compose.deps.yml up -d`.
   - Launches the backend in the `local` profile with `SERVER_PORT=0` and `.runtime/backend-port.txt` so the chosen port is recorded.
   - Starts the frontend (`npm run dev -- --host 0.0.0.0 --port 5173`) after reading the backend port and exporting it as `PMD_BACKEND_PORT`.
3. When you want to stop everything, go back to PMD Control and choose **[2] Stop ALL**, or run `pmd.bat down`/`scripts\pmd_dev_down.bat` from PowerShell.
4. Use **PMD Control** options [3]-[9] or the same verbs (`pmd.bat deps`, `pmd.bat backend`, `pmd.bat frontend`, `pmd.bat status`, `pmd.bat ops`) if you need a single service, want status, or want the animated ops cockpit in a separate PowerShell window.

> PMD Control verifies Docker, Java, and Node before starting anything and waits for Mongo, MailHog, and the backend health check to succeed, so the UI is ready as soon as the script prints `Ready:` with the URLs.

## Manual fallback (hybrid dev without the batch menu)

If you prefer to orchestrate things from PowerShell or want to replicate what `scripts\pmd_dev_up.bat` does, follow these steps.

### 1. Start dependencies (Mongo + MailHog)
```
docker compose -f docker-compose.deps.yml up -d
```
This brings up containers named `pmd-mongo` and `pmd-mailhog` with ports 27017, 1025, and 8025 mapped to localhost.

### 2. Start the backend with a dynamic port
Set the same environment variables that the script uses so the backend writes `.runtime\backend-port.txt`:
```
cd backend/pmd-backend
$Env:SPRING_DATA_MONGODB_URI='mongodb://localhost:27017/pmd'
$Env:SPRING_MAIL_HOST='localhost'
$Env:SPRING_MAIL_PORT='1025'
$Env:SPRING_PROFILES_ACTIVE='local'
$Env:SERVER_PORT='0'
$Env:PMD_RUNTIME_PORT_FILE='..\..\.runtime\backend-port.txt'
./mvnw spring-boot:run
```
When the backend starts it writes the selected port (e.g., `50321`) to `.runtime\backend-port.txt` and exposes the actuator health endpoint. Wait for that file before starting the frontend.

### 3. Start the frontend pointing to the actual backend port
```
cd frontend/pmd-frontend
npm ci
set PMD_BACKEND_PORT=<port-from-.runtime\backend-port.txt>
npm run dev -- --host 0.0.0.0 --port 5173
```
`PMD_BACKEND_PORT` is how the Vite dev server knows the backend address; the value is ordinarily read from the runtime port file by `scripts\pmd_dev_up.bat`, but you can export it manually if you start the backend yourself.

Use `scripts\pmd_dev_down.bat`, `pmd.bat down`, or stop the Maven/Node processes to tear everything down. The frontend still proxies `/api` and `/actuator` to the backend port set via `PMD_BACKEND_PORT`.

## Docker Compose (full stack / reviewer profile)

`docker-compose.local.yml` is the reviewer/full-stack compose file. It:

- Builds the backend image `pmd-backend-local` from `backend/pmd-backend` and the frontend image `pmd-frontend-local` from `frontend/pmd-frontend`.
- Runs Mongo, backend, frontend, and MailHog together with the `reviewer` profile so you can exercise the complete stack in Docker.
- Maps ports:
  - Backend: `${PMD_BACKEND_PORT:-8080}` -> container 8080
  - Frontend: `${PMD_FRONTEND_PORT:-5173}` -> container 80
  - Mongo: `${PMD_MONGO_PORT:-27017}` -> 27017
  - MailHog UI: `${PMD_MAILHOG_UI_PORT:-8025}` -> 8025
  - MailHog SMTP: `${PMD_SMTP_PORT:-1025}` -> 1025

Because Mongo and MailHog are already wired into this compose file, you do **not** need `docker-compose.deps.yml` when you run `docker compose -f docker-compose.local.yml --profile reviewer up -d --build`. This compose stack should be treated as a reviewer/CI path rather than the default day-to-day flow.

### Release readiness check (Docker/Nginx)

Use this sequence before tagging/pushing a release:

1. Validate compose files:
   - `docker compose -f docker-compose.yml config`
   - `docker compose -f docker-compose.deps.yml config`
   - `docker compose -f docker-compose.local.yml config`
   - `docker compose -f docker-compose.prod.yml config`
2. Validate Nginx config used by the frontend image:
   - `docker run --rm -v "${PWD}/frontend/pmd-frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:1.27-alpine nginx -t`
3. Build reviewer images:
   - `docker compose -f docker-compose.local.yml --profile reviewer build`
4. If `pmd-mongo`/`pmd-mailhog` already exist from deps mode, stop the previous stack first:
   - `docker compose -f docker-compose.deps.yml down`
   - or `docker compose -f docker-compose.local.yml down`

### Production compose note

`docker-compose.prod.yml` expects `PMD_JWT_SECRET` to be set.
Before running production compose, create a `.env` file (or export env vars) and set a long random value:

```
PMD_JWT_SECRET=your-long-random-secret-at-least-32-characters
```

## Ports & runtime facts

| Service | Local access | Notes |
| --- | --- | --- |
| Backend | `http://localhost:<dynamic port>` | `server.port=0` and the selected port is written to `.runtime/backend-port.txt`. `PMD_RUNTIME_PORT_FILE` points to that file and `PMD_BACKEND_PORT` is the helper env var the frontend reads. |
| Frontend | `http://localhost:5173` | Vite dev server listens on 5173 by default and proxies requests to the backend via `PMD_BACKEND_PORT`. |
| MongoDB | `mongodb://localhost:27017/pmd` | Exposed by `docker compose -f docker-compose.deps.yml` and `docker-compose.local.yml`. |
| MailHog UI | `http://localhost:8025` | SMTP listener is on `localhost:1025`, so update your mail config accordingly. |
| MailHog SMTP | `localhost:1025` | The backend defaults to that SMTP host/port in both hybrid scripts and Docker compose. |

## Backend port file (`.runtime/backend-port.txt`)

The backend writes the actual port number to `.runtime/backend-port.txt` whenever `SERVER_PORT=0` and `PMD_RUNTIME_PORT_FILE` is set (for example, `scripts\pmd_dev_up.bat` sets these values automatically). Read it in PowerShell with `Get-Content .\.runtime\backend-port.txt` or in Command Prompt with `type .runtime\backend-port.txt`. That port is used to:

1. Export `PMD_BACKEND_PORT` for the frontend so Vite can proxy `/api`.
2. Instruct health checks (`/actuator/health`) in the dev script.
3. Tell you where the backend actually listens after the batch scripts finish.

Always confirm the port file exists (the script waits up to 90 seconds for it) and contains a number between 1 and 65535 before trusting it in other commands.

## Troubleshooting

- **Port conflicts**: Use `Get-NetTCPConnection -LocalPort <port>` (PowerShell) or `netstat -ano | findstr :<port>` (CMD) to find the process listening on 5173, 27017, or the backend port. When you find a stale process, `taskkill /PID <pid> /F` or `Stop-Process -Id <pid>` clears it.
- **Port file missing**: Ensure you exported `PMD_RUNTIME_PORT_FILE` when running the backend or rerun `scripts\pmd_dev_up.bat`. `type .runtime\backend-port.txt` should print a single number; if it reports `empty` or `invalid`, the backend is still writing. Wait a few seconds and rerun the read command.
- **Docker container name conflicts**: `docker-compose.deps.yml` relies on containers named `pmd-mongo` and `pmd-mailhog`. Remove conflicting containers with `docker rm -f pmd-mongo pmd-mailhog` or run `docker compose -f docker-compose.deps.yml down` before `up`. Compose local also uses those names, so stop the stack via `docker compose -f docker-compose.local.yml down` before restarting.
- **Frontend can't reach backend**: Confirm `PMD_BACKEND_PORT` matches the number in `.runtime/backend-port.txt` and that the backend health check at `http://localhost:<port>/actuator/health` succeeds. The dev script will log readiness, but if you run things manually, replicate the same logging: `curl http://localhost:<port>/actuator/health` or open it in a browser.

## Quick scripts cheat sheet

| Script | What it does |
| --- | --- |
| `PMD.bat` | Windows menu; `up` starts everything, `down` stops, `deps` brings up Mongo/MailHog, `status` prints Docker/netstat info, `ops` opens `scripts/pmdops.py` in a new PowerShell. |
| `scripts\pmd_dev_up.bat` | Starts deps, backend (dynamic port), and frontend (Vite). Logs readiness and writes `.runtime/backend-port.txt`. |
| `scripts\pmd_dev_down.bat` | Stops the Maven/Node processes listed in `.pmd-dev-pids.json` and optionally the Docker deps. |
| `scripts\pmd_up_backend_dev.bat` / `scripts\pmd_up_frontend_dev.bat` | Individually start backend or frontend windows (used by the menu). |
| `docker compose -f docker-compose.deps.yml up -d` | Starts Mongo + MailHog alone when you only need the dependencies. |
| `docker compose -f docker-compose.local.yml --profile reviewer up -d --build` | Builds/runs the full reviewer stack (backend/frontend/Mongo/MailHog) inside Docker for parity checks. |
| `pmd.bat docker-up` / `pmd.bat docker-down` | Starts/stops the full Docker stack; `docker-up` rebuilds images and recreates containers. |

Note: `scripts/.pmd-dev-pids.json` is a local runtime state file (ephemeral PIDs for start/stop scripts). It is ignored by git and should not be committed.

## Runtime guardrails

- PMD now enforces a single active runtime mode: `dev`, `deps`, or `reviewer`.
- Starting one mode automatically stops conflicting PMD-managed services from other modes.
- PMD tracks active mode in `.runtime/pmd-active-mode.json`.
- `down` scripts perform deterministic cleanup (`docker compose ... down --remove-orphans`) instead of leaving partial state.

The README now reflects the current hybrid flow: dynamic backend ports, the `.runtime/backend-port.txt` contract, the PMD Control entry point, and what each Docker compose file actually provides.
