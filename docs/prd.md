# Phase 1 PRD — Project Management Tool (Extensible Baseline)

## Product goal
Build a minimal but real Project Management tool with an end-to-end vertical slice (Projects + Tasks) and production-minded foundations (clean architecture, tests, Docker, CI). Authentication is **backend-only scaffolding** (auth-ready) without UI login.

## Personas
- **User (single-tenant for now):** creates projects and tasks, tracks status/due dates, receives email notifications.
- **Future:** multiple users, ownership, roles/permissions.

## Core user flows
- Create a project ? view project list ? open project detail.
- Inside a project: create tasks ? edit tasks ? mark status ? delete tasks.
- System checks overdue tasks on schedule and can notify via email.

## Domain scope (Phase 1)
### In scope
- **Projects**
- **Tasks (belongs to Project)**
- **Task status**: TODO, IN_PROGRESS, DONE
- **Due date + overdue detection**
- **Scheduled job**: detects overdue tasks (and optionally sends summary/alerts)
- **SMTP mail integration**: safe dev-mode if not configured
- **MongoDB persistence**
- **Docker compose local stack**
- **GitHub Actions CI**: build/test/lint frontend+backend + optional docker build validation
- **Auth-ready backend design (no login UI)**

### Out of scope (Phase 1)
- Teams, organizations, multi-tenant
- Roles/permissions enforcement
- Comments, attachments, activity log
- Real-time updates (websockets)
- Advanced search/filtering beyond basics

## UX/UI constraints (Phase 1)
Frontend is simple and functional:
- Layout: sidebar + main content area
- Pages:
  - Projects list (+ create)
  - Project detail (project info + tasks list)
- Modals or inline forms are fine, but be consistent
- Provide loading + error states for all network actions

## Data model (MongoDB)
### Project
- id (ObjectId/string)
- name (string, required)
- description (string, optional)
- ownerUserId (string, required — from auth scaffold, not enforced yet)
- createdAt, updatedAt

### Task
- id
- projectId (required)
- title (string, required)
- description (string, optional)
- status (enum: TODO/IN_PROGRESS/DONE)
- dueDate (date, optional)
- isOverdue (boolean derived or stored; decide and document)
- ownerUserId (string, required)
- createdAt, updatedAt

## API (REST) — Phase 1
Base: `/api`

### Projects
- `GET /api/projects` ? list projects (later: filter by ownerUserId)
- `POST /api/projects` ? create
- `GET /api/projects/{id}` ? detail
- `PUT /api/projects/{id}` ? update
- `DELETE /api/projects/{id}` ? delete (decide cascade behavior for tasks; document in decisions)

### Tasks (scoped to project)
- `GET /api/projects/{projectId}/tasks` ? list tasks
- `POST /api/projects/{projectId}/tasks` ? create
- `GET /api/projects/{projectId}/tasks/{taskId}` ? detail
- `PUT /api/projects/{projectId}/tasks/{taskId}` ? update
- `DELETE /api/projects/{projectId}/tasks/{taskId}` ? delete

### System
- `GET /api/health` ? health check
- (Optional Phase 1) `POST /api/dev/seed` ? seed demo data (dev only)

## Auth approach (backend-only scaffolding)
Goal: be able to add JWT later with minimal rewrite.

### Phase 1 requirements
- Add `ownerUserId` to Project/Task and populate it from a **CurrentUserProvider**.
- Implement:
  - `CurrentUserProvider` interface
  - Default implementation returns a stable dev user id (e.g., `dev-user`) when no auth is configured.
- Add an HTTP filter/interceptor placeholder:
  - If `AUTH_MODE=dev` ? set current user = `dev-user`
  - If `AUTH_MODE=jwt` ? validate JWT and set current user (implementation can be partial or stub, but structure must exist)
- Do NOT build login/register endpoints in Phase 1.
- Do NOT require auth for requests in Phase 1 (but wire ownerUserId automatically).

## Scheduled task (Phase 1)
- Runs every N minutes (configurable).
- Finds tasks with dueDate < now AND status != DONE.
- Behavior:
  - Update an `overdue` marker OR compute and include in responses (choose one; document).
  - Send notification email only if SMTP is configured, otherwise log what would be sent.

## Email (SMTP) integration
- Use env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_TO (or per-user later)
- Safe defaults:
  - If SMTP not configured, no failure; log “email suppressed: smtp not configured”
- Provide one email type:
  - “Overdue Tasks Summary” or “Task Overdue Alert”

## Testing expectations
Backend:
- Unit tests for service logic (overdue detection, CRUD validations)
- Integration test with embedded Mongo OR testcontainers (choose simplest reliable; document)
Frontend:
- Minimal component test(s) and API client test stubs
CI must run tests.

## Non-functional requirements
- Consistent error responses (problem-details style or defined JSON shape)
- Input validation with clear 400 responses
- Logging for scheduled job and email sending
- No secrets in repo; provide `.env.example`

## Acceptance criteria (Phase 1)
- Can run `docker compose up` and use the app in browser.
- Create/update/delete Projects and Tasks from UI.
- Tasks show status and due date; overdue state is visible.
- Scheduled job runs and logs actions; sends email only when SMTP configured.
- GitHub Actions pipeline passes on PR: frontend lint/test/build + backend test/build (+ optional docker build).
- Auth-ready structure exists: ownerUserId wired via CurrentUserProvider and AUTH_MODE.

## Open decisions (answer in docs/decisions.md)
- Maven vs Gradle
- Overdue stored vs computed
- Cascade delete tasks when project deleted
- Test strategy: embedded mongo vs testcontainers
- Frontend routing approach (React Router) and UI library (none vs minimal)
