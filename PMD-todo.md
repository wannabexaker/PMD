Here is the notes that codex write from Ioannis instractions,
that will help codex to keep a todo list and when a task Done
codex will write 
----------------
|Done Done Done|
|Done Done Done|
|Done Done Done|
----------------



Dashboard â€“ Structural & UX refinement (professional pass)

Context
The dashboard currently mixes project lists, counters, and pie charts, but there are UX and logic issues:
- Missing â€œUnassignedâ€ visibility
- Pie charts are cramped and labels are truncated
- Font size and layout reduce readability
- Status logic is duplicated across cards, counters, and charts

Goals
Clean, professional dashboard with clear hierarchy, single-source-of-truth logic, and readable analytics.

Required changes

1) Add â€œUnassignedâ€ project column
- Add a new column at the far left named **Unassigned**
- It contains projects with zero assigned people
- Column order must be:
  Unassigned â†’ Assigned â†’ In Progress â†’ Completed
- Counts shown on the column headers must match backend stats exactly
- Project cards in Unassigned must behave exactly like others (menu, hover, etc.)

2) Status logic unification
- Define project status categories once (shared logic):
  Unassigned, Assigned, In Progress, Completed, Canceled, Archived
- Use this same logic for:
  - Left project columns
  - Top counters
  - Pie charts
- No duplicate or parallel counting logic in frontend components

3) Pie charts layout & readability
- Change pie charts layout to **vertical stacking** (one below the other)
- Ensure:
  - No label truncation (no â€œâ€¦â€)
  - Legends are fully readable
  - Slightly smaller font size (labels + legend text)
- Charts must resize gracefully and never overflow their cards

4) Visual hierarchy cleanup
- Reduce visual competition between:
  - Project columns (left)
  - Stats cards (right)
- Charts are secondary analytics, not primary navigation
- Keep spacing consistent and breathable

5) Professional UX details
- Keep color mapping consistent across:
  - Status badges
  - Pie slices
  - Legends
- Ensure numbers in counters, columns, and pies always match
- No hardcoded values; everything must come from stats API

Expected result
A clean, enterprise-grade dashboard:
- Immediate visibility of unassigned work
- Clear project distribution by status and team
- Readable charts without truncation
- One coherent data model powering all statistics

----------------
|Done Done Done|
|Done Done Done|
|Done Done Done|
----------------


MongoDB Data Model Refactor â€“ PMD (Professional Structure)

Goal
Redesign the MongoDB database schema from scratch so it is:
- Clean
- Explicit
- Easy to reason about
- Scalable for future features (stats, audits, analytics, permissions)
- Suitable for a professional, production-grade system

We allow DROP + RESEED of the database.

General Rules
- Use clear, explicit collection names (plural, lowercase)
- Avoid overloaded documents
- Prefer references over deeply nested documents
- Every entity must have:
  - _id
  - createdAt
  - updatedAt
- Use enums consistently (status, role, team)
- Prepare schema for statistics & historical tracking

--------------------------------
CORE COLLECTIONS
--------------------------------

1) users
Represents authentication identity.

Fields:
- _id
- email (unique, indexed)
- passwordHash
- displayName
- role (ADMIN | USER)
- isActive
- createdAt
- updatedAt

Indexes:
- email (unique)

--------------------------------

2) people
Represents the person inside the workspace (profile layer).

Fields:
- _id
- userId (ref users._id, unique)
- firstName
- lastName
- teamId (ref teams._id)
- title (e.g. Web Developer, PM)
- avatarUrl
- createdAt
- updatedAt

Indexes:
- userId
- teamId

--------------------------------

3) teams
Logical grouping.

Fields:
- _id
- name (unique)
- description
- color
- createdAt
- updatedAt

--------------------------------

4) projects
Main business entity.

Fields:
- _id
- name
- description
- status (UNASSIGNED | ASSIGNED | IN_PROGRESS | COMPLETED | CANCELED | ARCHIVED)
- teamIds [ref teams._id]
- startDate
- endDate
- createdAt
- updatedAt

Indexes:
- status
- teamIds

--------------------------------

5) project_assignments
Explicit assignment table (NO embedded arrays in projects).

Fields:
- _id
- projectId (ref projects._id)
- personId (ref people._id)
- role (optional: OWNER | CONTRIBUTOR)
- assignedAt
- unassignedAt (nullable)

Indexes:
- projectId
- personId
- active assignment compound index (projectId + unassignedAt)

--------------------------------

6) project_comments
All comments, text only.

Fields:
- _id
- projectId
- authorPersonId
- content
- createdAt
- updatedAt

--------------------------------

7) comment_attachments
Decoupled for scalability.

Fields:
- _id
- commentId
- fileName
- fileUrl
- mimeType
- size
- createdAt

--------------------------------

8) notifications
System notifications (email, UI, future push).

Fields:
- _id
- type (ASSIGNMENT | COMMENT | SYSTEM)
- recipientPersonId
- payload (generic object)
- readAt
- createdAt

--------------------------------
STATS / ANALYTICS SUPPORT
--------------------------------

9) project_events
Immutable event log for stats & audit.

Fields:
- _id
- projectId
- type (CREATED | STATUS_CHANGED | ASSIGNED | UNASSIGNED)
- actorPersonId
- metadata
- createdAt

--------------------------------

10) user_activity
Used for People â†’ personal statistics.

Fields:
- _id
- personId
- action (PROJECT_ASSIGNED, PROJECT_COMPLETED, COMMENT_ADDED)
- projectId
- createdAt

--------------------------------
SEEDING & RESET
--------------------------------

Provide:
- Database drop script
- Initial seed:
  - Teams
  - Users
  - People
  - Sample projects
  - Assignments
- Ensure demo data produces meaningful dashboard stats

--------------------------------
EXPECTED RESULT
--------------------------------

- Clear separation of concerns
- No duplicated data
- Easy to compute:
  - Unassigned projects
  - Projects per team
  - Workload per person
  - Historical stats
- Ready for CI/CD, production, and analytics

## 2026-01-27 – Project create visibility + assign-on-create

TODO
- [ ] Fix team filter: “all teams selected” must not hide unassigned projects (DashboardPage + AssignPage)
- [ ] Enhance CreateProjectForm: assign people with search + compact selected chips
- [ ] Wire create flow to update/refetch shared projects source immediately after create
- [ ] Backend: include createdBy fields in ProjectResponse + add dev logging for create/list DB/collection/filters
- [ ] Frontend: add createdBy fields to Project type + display minimally in project details
- [ ] Run frontend lint and backend mvnw tests
- [ ] List all files changed and verification commands

## 2026-01-27 – Completed

- [x] Fix team filter: “all teams selected” no longer hides unassigned projects (DashboardPage + AssignPage)
- [x] Enhance CreateProjectForm: assign people with search + compact selected chips
- [x] Wire create flow to update/refetch shared projects source immediately after create
- [x] Backend: include createdBy fields in ProjectResponse + add dev logging for create/list DB/collection/filters
- [x] Frontend: add createdBy fields to Project type + display minimally in project details
- [ ] Run frontend lint and backend mvnw tests
- [ ] List all files changed and verification commands

## 2026-01-27 – Statuses + archived gating + register overlay

TODO
- [ ] Backend: add/confirm `ARCHIVED` and `CANCELLED/CANCELED` statuses in enum + service handling
- [ ] Frontend: extend status types/options and unify filter/counter logic to include Archived + Cancelled
- [ ] Archived behavior: gate actions to Restore/Delete only; Restore -> Unassigned (NOT_STARTED + clear members)
- [ ] Delete: confirm hard delete endpoint + add compact confirmation in UI
- [ ] Charts: ensure status labels don’t crop with new statuses
- [ ] Register UX: make “Passwords do not match.” an overlay with no layout shift + a11y attrs
- [ ] Run lint + backend tests
- [ ] Record changed files + verification steps

## 2026-01-27 – Completed (statuses + archived gating + register overlay)

- [x] Backend enum already supports `ARCHIVED` and `CANCELED` (kept existing naming)
- [x] Added shared status module: `src/projects/statuses.ts` (single source of truth for folders, labels, status flow)
- [x] Dashboard: filters/counters/charts now include Canceled + Archived via shared status constants
- [x] Assign: filters/status badges/status select now use shared status constants
- [x] Archived gating: Dashboard details + Assign details now show only Restore/Delete when archived
- [x] Restore behavior: sets status to `NOT_STARTED` and clears `memberIds` (unassigned by existing logic)
- [x] Delete behavior: hard delete wired + compact confirm + clears selection
- [x] Register: password mismatch message is overlay (absolute) with no layout shift + aria attrs
- [ ] Run lint + backend tests
- [ ] Provide changed files + verification steps

## 2026-01-27 – Verification update

- [x] Frontend lint: `npm run lint` passes
- [x] Backend tests: `./mvnw -q -DskipTests=false test` passes

## 2026-01-27 – Epic: Assign Smart Filters + Randomizer + Recommendations

Epic
- [ ] Assign Smart Filters + Randomizer + Recommendations (end-to-end FE/BE/DB)

Backend
- [ ] Extend User/Person model with recommendations aggregation fields (`recommendedByUserIds`, optional `recommendedCount`)
- [ ] Add recommendation endpoints:
  - [ ] POST `/api/people/{personId}/recommendations/toggle`
  - [ ] GET `/api/people/{personId}/recommendations`
  - [ ] GET `/api/people/recommended`
- [ ] Add project endpoints:
  - [ ] GET `/api/projects?assignedToMe=true`
  - [ ] POST `/api/projects/random`
  - [ ] POST `/api/projects/{projectId}/random-assign`
- [ ] Implement server-owned random selection:
  - [ ] Fewest ACTIVE projects rule (exclude `ARCHIVED` + `CANCELED`)
  - [ ] Team filter support
  - [ ] 409 on empty candidate pool with clear message
- [ ] Add minimal tests for random-assign + assignedToMe filtering

Frontend
- [ ] Update shared types + API clients for new contracts
- [ ] Assign page:
  - [ ] Add “Assigned to me” filter chip
  - [ ] Add “Random Project” button (+ optional team filter for random tools)
  - [ ] Add “Random Assign” button when a project is selected
  - [ ] Pin recommended people at top with star badge + tooltip
  - [ ] Add “Recommended” filter option
- [ ] People page:
  - [ ] Add “Recommended” filter option
  - [ ] Show star badge and allow toggle + tooltip
- [ ] Ensure truncation + tooltip + no layout jump

Verification
- [ ] `npm run lint`
- [ ] `./mvnw -q -DskipTests=false test`
- [ ] Manual flows (Assign random project/assign, recommendations, recommended filter)

## 2026-01-27 – Completed (Assign smart filters + randomizer + recommendations)

- [x] Backend: recommendation fields on `User` + consistency in `UserService.save`
- [x] Backend: people recommendation endpoints under `/api/people/*`
- [x] Backend: `/api/projects?assignedToMe=true`
- [x] Backend: `/api/projects/random` and `/api/projects/{id}/random-assign`
- [x] Backend: fewest ACTIVE projects rule (NOT_STARTED + IN_PROGRESS)
- [x] Backend: added focused `ProjectServiceTest` for assignedToMe and random-assign
- [x] Frontend: types + API clients updated for new contracts
- [x] Assign: Assigned to me filter + random tools + random assign
- [x] Assign: recommended pool pinned top with interactive star + tooltip
- [x] People: recommended filter + interactive star + tooltip
- [x] Frontend lint passes (`npm run lint`)
- [x] Backend tests pass (`./mvnw -q -DskipTests=false test`)

## 2026-01-27 – People page layout gap + editable widgets

TODO
- [x] Diagnose People page selection layout gap (compare no-selection vs selected DOM/CSS)
- [x] Fix layout: left directory + right details scrollable, no blank gap on selection
- [x] Add People widgets edit UI + persistence (visible/order/config)
- [x] Backend: add peoplePageWidgets to user profile + PATCH endpoint
- [x] Frontend: edit mode, save/cancel, apply preferences
- [x] Update notes with root cause + decisions
- [ ] Verify People selection (no gap) + widget prefs persist on refresh

## 2026-01-27 – UI polish: toolbar icon hover + profile pill

TODO
- [x] Standardize search/filter icon button states (hover/active/disabled) with readable contrast
- [x] Style profile name control as pill button (theme-safe, focus-visible ring)
- [ ] Verify hover/active in dark + light themes

## 2026-01-27 – UI regression: Assign layout + dice random

TODO
- [x] Fix Assign header/control alignment (no overlap)
- [x] Replace Random Project button with dice icon
- [x] Standardize dice icon for random actions
- [ ] Verify responsive layout + DnD

## 2026-01-27 – UI regression: filter active state + assign meta layout

TODO
- [x] Fix filter icon default/hover/active states (active only when toggled)
- [x] Fix Assign project card meta layout (status + members row stable)
- [ ] Verify dashboard filter + assign meta row

## 2026-01-27 – UI regression: Assign panel overflow

TODO
- [x] Fix Assign panel horizontal bleed (grid min-width/overflow)
- [ ] Verify Assign panels stay within bounds on resize

## 2026-01-27 – Assign Available People layout regression (2x2 + vertical scroll)

TODO
- [x] Force Available People to stable 2-column grid with vertical scroll
- [x] Fix card sizing/alignment (min-height, truncation, actions column)
- [ ] Verify assign/unassign keeps grid stable

## Assign CSS overhaul (full-width + 3 critical issues)

TODO
- [x] Make /assign full-width with route-specific container override
- [x] Fix Available People cards collapsing (main column flex + min-width)
- [x] Normalize Assign panel headers/controls layout
- [ ] Verify 3-column layout + panel scroll

## 2026-01-27 – CI fix: TS null guard + Mongo service

TODO
- [x] Fix TS2345 in ProjectDetails (null guard)
- [x] Add MongoDB service to backend CI job
- [ ] Run frontend build + backend tests

## Fix Filter button hover/active effect (Dashboard + People)

TODO
- [x] Normalize filter active state on Dashboard + People to use default selection state
- [x] Fix filter icon hover/active CSS to match Assign baseline
- [ ] Verify Dashboard + People filter behavior in dark/light themes

## 2026-01-28 – v0.0.2 snapshot + CI tags + local compose

TODO
- [x] Step A: create and push annotated tag v0.0.2
- [x] Step B: enable CI/CD on tag pushes and add image tag :v0.0.2
- [x] Step C: add docker-compose.local.yml and README section for one-command run

## 2026-01-28 – Fix JWT secret in docker-compose.local.yml

TODO
- [x] Update PMD_JWT_SECRET to a secure 32+ char value for local compose

## 2026-01-28 – Local compose reliability (mongo + orphan cleanup)

TODO
- [ ] Update docker-compose.local.yml to ensure mongo starts and backend uses service name
- [ ] Add mongo healthcheck + depends_on condition for backend
- [ ] Decide on mailhog inclusion or remove orphan warnings
- [ ] Ensure JWT secret is safe default (no real secret)
- [ ] Update README local run + clean reset commands
- [ ] Verify fresh clone up -d starts all services


## 2026-01-28 – Local compose reliability (mongo + orphan cleanup) – Completed
- [x] Update docker-compose.local.yml to ensure mongo starts and backend uses service name
- [x] Add mongo healthcheck + depends_on condition for backend
- [x] Include mailhog to avoid orphan warnings
- [x] Ensure JWT secret safe default (no real secret)
- [x] Update README local run + clean reset commands


## 2026-01-28 – Backend Mongo env precedence (docker local)

TODO
- [ ] Find why SPRING_DATA_MONGODB_URI is ignored in Docker
- [ ] Remove/override any localhost fallback in config
- [ ] Confirm backend container receives env vars
- [ ] Verify backend stays up and actuator health is UP


## 2026-01-28 – Backend Mongo env precedence (docker local) – Completed
- [x] Find why SPRING_DATA_MONGODB_URI is ignored in Docker
- [x] Remove/override any localhost fallback in config
- [x] Confirm backend container receives env vars
- [x] Verify backend stays up and actuator health is UP


## 2026-01-28 – Backend Mongo env precedence (docker local) – Verification
- [x] docker compose up -d starts backend with mongo service host
- [x] curl http://localhost:8080/actuator/health returns status UP


## 2026-01-28 – Demo seed expansion
todo:
- [ ] Add comprehensive demo seeding of 10 named users + 10 matching projects
- [ ] Ensure seeds run conditionally (dev profile or PMD_SEED_DEMO)
- [ ] Document new demo users/projects for quick login reference
- [ ] Tag release as v0.0.3 without disturbing current master

\n## 2026-01-28 – Demo seed expansion – Completed\n- [x] Add comprehensive demo seeding of 10 named users + 10 matching projects\n- [x] Ensure seeds run conditionally (dev profile or PMD_SEED_DEMO)\n- [x] Document new demo users/projects for quick login reference\n- [x] Tag release as v0.0.3 without disturbing current master\n
\n- [x] Enable docker-compose to trigger demo seed automatically for local runs

## 2026-01-28 â€“ Backend docker stability (Mongo URI + JWT)

TODO
- [x] Reproduce backend exit in C:\Projects\PMD and capture logs/inspect
- [x] Fix Mongo URI resolution for dev profile (docker network)
- [x] Add JWT secret validation + dev auto-generation
- [x] Make startup runners resilient to Mongo not-ready
- [x] Update local compose to build backend and use safe dev JWT secret
- [ ] Verify backend stays up 2+ minutes and /actuator/health is UP

## 2026-01-28 â€“ Backend docker stability (Mongo URI + JWT) â€“ Verification
- [x] Backend stays up 2+ minutes in C:\Projects\PMD after `docker compose up -d --build`
- [x] `curl http://localhost:8080/actuator/health` returns status UP

## 2026-01-28 â€“ Connectivity audit tasks

TODO
- [x] Capture Maven failure stack trace and record in notes
- [x] Define local/docker profiles and defaults (Mongo + JWT)
- [x] Ensure Docker backend uses mongo service name
- [x] Remove backend filters hiding projects for non-admins
- [ ] Verify Maven run works after JWT/local profile changes
- [ ] Verify projects visible after seed + create (Dashboard + Assign)
- [ ] Update README run modes + frontend API base env

## 2026-01-28 â€“ Maven run verification (notes)
- [ ] Re-run `./mvnw spring-boot:run` on a free port to confirm it stays up (last attempt hit port conflict)
- [x] API smoke test: login + /api/projects returns seeded projects
- [x] Added deterministic local/docker profiles with explicit ports and JWT handling
- [x] Updated README with profiles/ports + troubleshooting
- [x] Seeders retry/backoff updated and demo seed protected
- [ ] Re-verify Maven run on port 8099 (ensure port is free)
- [x] Frontend dev defaults to backend 8099 (prod build stays 8080)

## 2026-01-29 - Teams as first-class feature

TODO
- [ ] Verify Teams seed brings total to 10 when some already exist
- [ ] Verify People/Projects visible when users/projects lack teamId (legacy data)
- [ ] Run backend tests + frontend lint after Teams changes
- [ ] Add local verification steps to summary output

Completed
- [x] Added Team domain (model/repo/service/controller) + /api/teams endpoints
- [x] Added teamId to User + Project, plus teamName in responses
- [x] Updated filters (Dashboard/Assign/People) to use teamId
- [x] Inline '+ New Team' for Admin on Add Project
- [x] Seeded default Teams list + admin-only create
- [x] Enforced admin visibility rules server-side (non-admins cannot see admin users)

## 2026-01-29 - Backend offline UI + port management

TODO
- [ ] Verify docker compose healthchecks pass on fresh build
- [ ] Confirm frontend shows offline banner and clears stale data when backend is down
- [ ] Confirm API base URL log appears in browser console

Completed
- [x] Added backend offline/online events and banner; clear stale users/projects
- [x] Added .env-driven port mappings in docker-compose.local.yml
- [x] Added backend/frontend healthchecks and depends_on service_healthy
- [x] Added backend Dockerfile curl for healthcheck
- [x] Added scripts/diagnose-ports.ps1

## 2026-01-29 - Docker health verification (follow-up)

Completed
- [x] docker compose up --build passes (backend builds)
- [x] Backend healthcheck passes (actuator/health UP)
- [x] /api/teams returns 10 teams
- [x] Fixed StatsService missing normalizeTeam (build blocker)
- [x] Adjusted TeamIntegrationTest to build MockMvc without AutoConfigureMockMvc

TODO
- [ ] Manually verify offline banner + stale data clearing + repopulate after backend restart (requires browser)

## 2026-01-29 - Evidence run blocked

TODO
- [ ] Start Docker Desktop and re-run mandatory Docker evidence commands
- [ ] Only then proceed with preflight/run-local scripts and any further changes

## 2026-01-29 - Register redirect + Settings persistence

TODO
- [ ] Manually verify register success -> auto redirect to /login
- [ ] Verify Settings toggles: Dashboard/Assign/People selection persistence
- [ ] Verify logout clears selections + session state

Completed
- [x] Added Settings page and nav entry
- [x] Added UI preferences stored in localStorage
- [x] Added sessionStorage selection store and clear on logout/login
- [x] Split Dashboard vs Assign selected project state
- [x] Added People selection/filter persistence gating

## 2026-01-29 - PMD Docker guardrail scripts

Completed
- [x] PMD containers stopped/removed
- [x] PMD networks/volumes removed
- [x] docker-compose.local.yml set to fixed project name `pmd`
- [x] Added scripts: preflight, start, stop, reset (with C:\Projects\PMD guard)
- [x] README updated with scripts + clone warning

TODO
- [ ] Run scripts/pmd-start.ps1 once to confirm new workflow
- [ ] Verify preflight detects port conflicts

## 2026-01-29 - Rollback guard scripts

Completed
- [x] Removed guard scripts per user request
- [x] Restored README compose commands

TODO
- [ ] Follow manual rule: never run from clone unless explicitly asked

## 2026-01-29 - Manual-only start/stop (no auto-start)

Completed
- [x] Removed restart policies from compose files
- [x] Added simple manual scripts without guards
- [x] Documented manual commands

## 2026-01-29 - Feature coverage gaps (Step 1)

Projects
- [ ] Decide UI vs backend-only for /api/projects/my-stats

People
- [ ] Decide UI vs backend-only for /api/people CRUD
- [ ] Decide UI vs backend-only for /api/stats/user/me and /api/stats/user/{id}
- [ ] Verify register auto-redirect

Teams
- [ ] Decide UI vs backend-only for /api/teams/{id} PATCH

Stats
- [ ] Decide UI vs backend-only for /api/stats/dashboard

Assignments
- [ ] No gaps (random + assign covered)

Auth/Settings
- [ ] Verify settings persistence behavior

## 2026-01-29 - Gap closure status

Projects
- [x] /api/projects/my-stats UI (Profile -> My dashboard stats)

People
- [x] /api/people CRUD UI (People page)
- [x] /api/stats/user/me UI (Profile -> My stats)
- [ ] /api/stats/user/{id} documented backend-only

Teams
- [x] /api/teams/{id} PATCH UI (Admin -> Teams edit)

Stats
- [x] /api/stats/dashboard UI (Dashboard -> Workspace summary)

Auth/Settings
- [ ] Verify register auto-redirect
- [ ] Verify settings persistence behavior

## 2026-01-29 - Toast notifications + auth form layout fix

DONE
- [x] Add toast overlay (success/error/info) with auto-dismiss.
- [x] Register and Login use toast for global errors; remove inline banners.
- [x] Inline field errors reserve space to prevent layout jump.

TODO
- [ ] Consider applying toast to other forms that still use inline global errors.

## 2026-01-29 - Workspace Stage A

DONE
- [x] Backend workspace domain (Workspace, WorkspaceMember, WorkspaceInvite).
- [x] /api/workspaces create/list/join endpoints (auth required).

TODO
- [ ] Stage B: add workspaceId to Teams/People/Projects/Assignments/Stats + scoped routes.
- [ ] Stage C: demo workspace create/reset + deterministic seed.
- [ ] Stage D/E: frontend workspace picker/store + remove team from register + scoped API client.
- [ ] Add invite creation endpoint/UI (needed for join flow).

## 2026-01-29 - Workspace Stage B

DONE
- [x] Add workspaceId to Team/Person/Project and scope core endpoints under /api/workspaces/{workspaceId}/...
- [x] Enforce workspace membership checks in controllers/services.

TODO
- [ ] Stage C: demo workspace create/reset + deterministic seed.
- [ ] Stage D/E: frontend workspace picker/store + remove team from register + scoped API client.
- [ ] Add invite creation endpoint/UI (needed for join flow).
- [ ] Remove/replace any remaining global endpoints (if any exist).

## 2026-01-29 - Workspace Stage C

DONE
- [x] Demo workspace endpoints (create/get + reset) with demo-only guard.
- [x] DemoWorkspaceSeeder for workspace-scoped seed + reset.

TODO
- [ ] Stage D/E: frontend workspace picker/store + remove team from register + scoped API client.
- [ ] Add invite creation endpoint/UI (needed for join flow).
- [ ] Update frontend to use demo endpoints and workspace-scoped routes.

## 2026-01-29 - Workspace Stage D/E

DONE
- [x] Frontend workspace picker + active workspace store (localStorage).
- [x] Workspace switcher in top bar.
- [x] Workspace-scoped API calls wired across main pages.
- [x] Demo workspace controls in Settings (enter/reset).
- [x] Register payload no longer sends team; onboarding banner prompts team join.

TODO
- [ ] Add invite creation endpoint/UI for join flow.
- [ ] Manual verification: switch workspaces, demo reset, logout clears workspace.

## 2026-01-29 - Compose run after workspace wiring

DONE
- [x] docker compose up -d --build succeeds.
- [x] Backend healthcheck returns UP.

TODO
- [ ] Manual UI smoke test (workspace picker, demo reset, switcher, team banner).

## 2026-01-29 - Frontend local build

DONE
- [x] docker-compose.local.yml builds frontend locally (pmd-frontend-local).

TODO
- [ ] Manual UI check: WorkspacePicker appears, Settings demo controls visible, no Not Found errors.

## 2026-01-29 - Hybrid local dev workflow

DONE
- [x] Added docker-compose.deps.yml (mongo + mailhog only).
- [x] Added docs/DEV-HYBRID.md with hybrid dev steps.
- [x] Added .env.example files for backend and frontend.
- [x] Added scripts for deps up/down/reset + backend/frontend/dev launcher.

TODO
- [ ] (Optional) Add .bat wrappers for ps1 scripts if needed for double-click.

## 2026-01-29 - Hybrid dev .bat wrappers

DONE
- [x] Added .bat wrappers for deps/dev scripts.

## 2026-01-29 - Script naming cleanup

DONE
- [x] Renamed hybrid dev scripts to pmd_up_ / pmd_down_ prefix.

## 2026-01-29 - Workspace settings + last workspace

DONE
- [x] Settings Workspaces panel (create/join/demo/reset).
- [x] Persist last workspace in localStorage (pmd:lastWorkspaceId).
- [x] Sidebar disabled when no workspace (redirect to Settings).

TODO
- [ ] Manual UI verification for workspace join via URL token.

## 2026-01-29 - Frontend polish

DONE
- [x] Settings Workspaces unified with demo group + scroll.
- [x] Compact Create Project layout.
- [x] Assign duplicate team filter cleaned + self-recommend message auto-hide.

## 2026-01-29 - Workspace invites + approvals + People copy

DONE
- [x] Add workspace invite endpoints (create/list/revoke/resolve).
- [x] Add join requests (pending/approve/deny) and requireApproval toggle.
- [x] Settings UI for invites + pending approvals.
- [x] Join input accepts token, code, or invite link.
- [x] Active workspace key updated to pmd.activeWorkspaceId (legacy cleared).
- [x] People page copy updated for non-admin; admin-only records hidden from members.

TODO
- [ ] Manual verify: invite join (approval off/on), pending badge, approve/deny flow.
- [ ] Manual verify: People page for non-admin shows "Workspace members" and no admin-only copy.

## 2026-01-30 - Ports/communication audit

DONE
- [x] Documented current port listeners + expected wiring.
- [x] Updated hybrid docs/scripts to use backend 8099.
- [x] Updated frontend .env.example to 8099.

TODO
- [ ] Run deps + backend + frontend and confirm Mongo + MailHog reachability.
- [ ] If running docker-compose.local.yml, set PMD_BACKEND_PORT to avoid port 8080 conflict.

## 2026-01-30 - User manual + port clarity

DONE
- [x] Added docs/USER-MANUAL.md (indexed run/stop/status/debug/reset guide).
- [x] Updated legacy scripts to align with hybrid backend port 8099.
- [x] Updated README for VITE_API_BASE_URL example and hybrid vs docker backend ports.

TODO
- [ ] Manual verify: hybrid flow (deps -> backend -> frontend) end-to-end.
- [ ] Manual verify: dockerized flow with PMD_BACKEND_PORT override if 8080 is taken.

## 2026-01-30 - Workspace RBAC + demo seed + initial teams

DONE
- [x] Workspace roles model with explicit permission flags.
- [x] Default roles (Owner/Manager/Member/Viewer) created per workspace.
- [x] Permissions enforced for teams/projects/assign/stats/invites/approvals/settings.
- [x] Workspace create supports initialTeams and seeds General when empty.
- [x] Demo workspace seed enriched (roles, teams, members, projects, invite, pending request).
- [x] Workspace response includes roleName + permissions; UserSummary includes roleName.
- [x] Settings uses permission flags; initial teams UI added; Teams panel added.
- [x] People page shows role badges.

TODO
- [ ] Manual verify RBAC flows (invite by member, approval by manager/owner, deny by non-approver).
- [ ] Manual verify demo reset restores invite + pending request + roles.
- [ ] Manual verify create workspace with initial teams shows teams in Create Project.
