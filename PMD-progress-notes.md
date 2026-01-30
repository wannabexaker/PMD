Here is the notebook that Codex will note all the useful informations, 
informations that maybe we need in the future, 
also a list of changes done by codex that was written at PMD-todo.md as lakonic as posible.
## 2026-01-27 – New project not visible (diagnosis + plan)

Root-cause hypothesis (evidence in code):
- Dashboard and Assign default the team filter to “all teams selected”.
- The team filter logic requires a project to have at least one member whose team is selected.
- Newly created projects often have `memberIds: []`, so they fail the team filter and are hidden.

Planned fixes:
- Treat “all teams selected” as no-op in `projectMatchesTeamFilter` on both Dashboard and Assign.
- Ensure create flow refetches/updates the shared projects state immediately.
- Extend create UI to assign people with search.
- Surface author/creator (backend response + minimal frontend display).
- Add dev logging for create/list DB/collection/query filters.

## 2026-01-27 – Progress update (visibility bug + create enhancements)

What I changed:
- Root cause fixed: team filter now treats “all teams selected” as a no-op in `DashboardPage.tsx` and `AssignPage.tsx`, so new projects with empty `memberIds` are not hidden by default.
- Create flow improved: `CreateProjectForm.tsx` now supports assign-on-create with search + team filter, and shows compact selected chips.
- Immediate UI update: `App.tsx` now inserts the created project into shared state before refetching.
- Contract alignment: backend `ProjectResponse` now includes `createdByUserId`, `createdByName`, and `createdByTeam`.
- Dev logging added: backend `ProjectService` logs Mongo db/collection plus create/list context at debug level.

Why the bug happened:
- Default team filter selected all teams but still required at least one assigned member, excluding newly created unassigned projects.

## 2026-01-27 – Statuses + archived gating + register overlay (progress)

Findings / decisions:
- Backend already supports `ARCHIVED` and `CANCELED` in `ProjectStatus`.
- Kept the existing `CANCELED` spelling to avoid contract mismatch.
- Centralized status folders/labels/flow in `frontend/pmd-frontend/src/projects/statuses.ts` and reused it in Dashboard + Assign.

Key changes:
- Dashboard:
  - Status filter options now come from the shared status module.
  - Counters now include Canceled + Archived, derived from `scopedProjects`.
  - Archived details are gated: only Restore/Delete actions render; editors/comments/save are hidden.
  - Restore now sets status to `NOT_STARTED` and clears `memberIds` via the existing update endpoint.
- Assign:
  - Replaced local status constants with the shared status module.
  - Added archived gating: only Restore/Delete actions render; status select, dropzone, and save button are hidden/disabled.
  - Restore sets status to `NOT_STARTED` and clears `memberIds`; delete clears selection and refetches.
- Charts:
  - Pie charts are now vertically stacked by default, and legend font/gap were reduced to avoid label cropping.
- Register UX:
  - Password mismatch now uses overlay positioning tied to the confirm password field, with `aria-invalid`, `aria-describedby`, and `aria-live="polite"`.
  - Removed the submit-time mismatch message from the global error area to avoid layout shift.

## 2026-01-27 – Verification

- Frontend lint (`npm run lint`) passes after changes.
- Backend tests (`./mvnw -q -DskipTests=false test`) pass.

## 2026-01-27 – Assign smart filters + randomizer + recommendations (contracts)

Data model decisions:
- Assignable “people” are the existing `users` documents.
- Contract mapping: `personId == userId` for `/api/people/*` endpoints.
- User recommendation fields:
  - `recommendedByUserIds: string[]`
  - `recommendedCount: number` (denormalized; synchronized in `UserService.save`)

Counting rules (fewest projects):
- Active project count uses ONLY `NOT_STARTED` and `IN_PROGRESS`.
- `CANCELED` and `ARCHIVED` are excluded from the “fewest projects” algorithm.

Backend endpoint contracts:
- GET `/api/projects?assignedToMe=true`
  - Filters to projects where `memberIds` contains the current principal user id.
- POST `/api/projects/random`
  - Body: `{ teamId?: string }`
  - Random project candidates exclude `ARCHIVED` and `CANCELED` and respect non-admin visibility.
  - If `teamId` is provided, the server validates that the team has at least one eligible user; it does NOT currently filter projects by team because projects have no team field.
- POST `/api/projects/{projectId}/random-assign`
  - Body: `{ teamId?: string }`
  - Algorithm:
    1) Candidates = assignable users (optionally filtered by `teamId`) excluding already assigned members
    2) Compute active counts (NOT_STARTED + IN_PROGRESS)
    3) Select min-count pool
    4) Random pick within min-count pool
    5) Assign exactly 1 user (no duplicates)
  - Returns: `{ project: ProjectResponse, assignedPerson: UserSummaryResponse }`
  - Returns 409 when no eligible projects/people exist or when project is not eligible.
- POST `/api/people/{personId}/recommendations/toggle`
  - Toggles current user’s recommendation; prevents recommending yourself (409).
  - Returns: `{ personId, recommendedCount, recommendedByMe }`
- GET `/api/people/{personId}/recommendations`
  - Returns recommenders as `UserSummaryResponse[]`.
- GET `/api/people/recommended?teamId=...`
  - Returns recommended users (`recommendedCount > 0`) sorted by count desc then display name.

## 2026-01-27 – Implementation notes (Assign smart filters + randomizer + recommendations)

What changed:
- Backend
  - Extended `User` with `recommendedByUserIds` and `recommendedCount`.
  - User summaries now include `recommendedCount` and `recommendedByMe`.
  - Added `/api/people` recommendation endpoints and `/api/projects` random + assignedToMe support.
  - Random selection is server-owned and uses “fewest ACTIVE projects then random among the minimal pool”.
- Frontend
  - Assign:
    - Added filter options: Recommended + Assigned to me.
    - Assigned-to-me uses the backend endpoint locally (without mutating global project state).
    - Added random tools: team-scoped random project and random assign.
    - Recommended pool (fewest active projects) is pinned at the top of Available People.
    - Star badge toggles recommendations and shows a hover tooltip with recommenders.
  - People:
    - Added Recommended filter, star toggle, and recommenders tooltip.

UX guardrails applied:
- No layout jump: hover states use shadows/opacity, not margin/padding changes.
- Long names truncate with `title` tooltips.
- Star button uses stopPropagation to preserve click-to-select behavior.

## 2026-01-27 – People page layout gap + editable widgets (start)

Planned work:
- Diagnose selection gap by comparing layout/DOM with and without selection in People page.
- Implement structural fix (no min-height/flex stretch causing blank space).
- Add per-user peoplePageWidgets config with backend endpoints and frontend edit UI.

## 2026-01-27 – People page selection gap (root cause + fix)

Root cause:
- `.people-layout` grid stretched both columns to the tallest item when a person was selected.
- The left directory card stretched to match the taller details panel, while its inner scroll area was capped by `max-height`, leaving a large blank gap.

Fix:
- Set `.people-layout` to `align-items: start` and constrain both cards with `max-height` and `overflow: auto`.
- Converted the directory card to a two-row grid so the list scrolls within a stable container.

## 2026-01-27 – People widgets preferences (decision + contract)

Decision:
- Store `peoplePageWidgets` on the user profile with `visible`, `order`, and `config`.
- Defaults include `projectsByStatus` and `activeVsInactive` with status labels matching stats (“Not started”, “In progress”, “Completed”, “Canceled”, “Archived”).

Endpoint contract:
- PATCH `/api/auth/me/people-page-widgets` accepts `{ visible, order, config }` and returns merged preferences.
- GET `/api/auth/me` returns `peoplePageWidgets` with defaults if missing.

## 2026-01-27 – UI polish: toolbar icons + profile pill

What changed:
- Standardized toolbar icon buttons (search/filter) with new icon-toggle styles: subtle hover, clear active ring, readable contrast in both themes.
- Styled the top-right profile name as a pill button (profile-pill) with consistent border/background and focus-visible ring; added tooltip + truncation.

Reason:
- Prevent icon color from washing out on hover while keeping active state consistent with Assigned to me toggle, and remove the harsh default focus rectangle on the profile control.

## 2026-01-27 – UI regression: Assign layout + dice random (start)

Planned: align Assign header/control bars, replace random buttons with dice icon, standardize random action buttons.

## 2026-01-27 – UI regression: Assign layout + dice random (fix)

Root cause:
- Assign panel controls were split into separate blocks and mixed grid/absolute layout, causing header controls to drift and overlap when content wrapped.

What changed:
- Consolidated Assign panel headers into a single flex row with fixed min-height and consistent spacing.
- Replaced Random Project and Random Assign text buttons with a shared dice icon button using the icon-toggle style.
- Added responsive wrapping at 960px to prevent overlaps without layout jump.

## 2026-01-27 – UI regression: filter active state + assign meta layout (start)

Clarification:
- Filter icon should only show active styling when toggled; default matches search icon, hover adds purple accent.

## 2026-01-27 – UI regression: filter active state + assign meta layout (fix)

Root cause:
- Filter active state was derived from selected.length < allOptions.length, so defaults that omit extras (e.g., Unassigned/Recommended) made the filter appear active by default.
- Assign project cards inherited a grid meta row without flex constraints, so the status + members row could overflow or clip inside the card.

Final behavior spec:
- Filter icon: neutral by default, purple hover, and ON styling only when selection deviates from the default set.
- Assign project cards: title row + meta row with stable flex sizing (status badge + members text).

What changed:
- Added explicit ilterActive computation in Dashboard/Assign and passed it to FilterMenu.
- Scoped Assign project card meta layout to flex row with min-width:0 to prevent clipping.

## 2026-01-27 – UI regression: Assign panel overflow (fix)

Root cause:
- Assign grid used min column widths plus nested grids with min-width defaults, allowing child content (folder headers / project grid) to exceed the panel width and bleed into adjacent columns.

What changed:
- Assign grid columns now use minmax(0,1fr) and panels enforce overflow hidden.
- Panel body scrolls vertically only; overflow-x hidden to contain inner grids.
- Scoped Assign layout to ensure dashboard folder/project grid elements can shrink within the panel.

## 2026-01-27 – Assign Available People layout regression (start)

Goal: lock Available People to 2-column grid with vertical scroll, no random widths or blank cards.

## 2026-01-27 – Assign Available People layout regression (fix)

Root cause:
- Available People grid inherited auto-fit column rules and grid sizing from shared layouts, causing unstable widths and empty/phantom gaps when items changed.

Final CSS rules:
- Grid: grid-template-columns: repeat(2, minmax(0, 1fr)), gap: 12px, lign-content: start.
- Panel body: overflow-y: auto, overflow-x: hidden, lex: 1, min-height: 0.
- Card sizing: min-height: 78px, padding: 10px 12px, left column lex: 1; min-width: 0, right actions lex: 0 0 auto.

## 2026-01-27 – Assign CSS overhaul (full-width + 3 critical issues)

Findings / fixes:
1) Blank/tiny Available People cards
- Root cause: card content column collapsed under flex/grid mix and inherited auto-fit grid sizing.
- Fix: .assign-page .available-people-grid now fixed 2 columns; .people-card-main is lex:1; min-width:0; display:flex; flex-direction:column; gap:4px; and cards have min-height:78px + padding:10px 12px.
2) Header controls mislayout
- Root cause: header controls lacked a consistent flex row and inputs could shrink/overflow unpredictably.
- Fix: .assign-panel-header min-height 48px, .assign-panel-controls flex row, .assign-page .member-filters uses flex with gap:8px, inputs/selects lex:1 1 0; min-width:0.
3) Assign not full width
- Root cause: page always used .container max-width 1080px.
- Fix: route-specific container-full on /assign, with max-width:none; width:100%; padding-left/right:28px (16px on small screens).

## 2026-01-27 – CI fix (TS null guard + Mongo service)

Root causes:
- TS2345: etchProject returns Project | null, but initializeSelected expected Project.
- Backend CI: no MongoDB service in runner, so contextLoads failed on MongoTemplate.

Changes:
- rontend/pmd-frontend/src/components/ProjectDetails.tsx: guard null response before calling initializeSelected and mark notFound when null.
- .github/workflows/ci.yml: added MongoDB service and SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/pmd.

Notes:
- npm ci failed locally due to EPERM unlink on esbuild.exe (Windows file locked).
- npm run build failed because tsc not found (node_modules missing after npm ci failure).
- Backend ./mvnw test succeeded locally.

## 2026-01-27 – Filter button hover/active fix (Dashboard + People)

Root cause:
- Filter active state was derived from selected.length < allOptions.length, so defaults that omit extras (e.g., Unassigned/Recommended) made the filter button appear active by default on Dashboard/People.

Final behavior + CSS:
- Active only when filter deviates from the default selection set (Dashboard) or when Recommended/teams are adjusted (People).
- Uses shared icon toggle styles: .icon-toggle idle, .icon-toggle:hover for hover accent, .icon-toggle[data-active='true'] for ON state.
- Key selectors: rontend/pmd-frontend/src/App.css .icon-toggle / .icon-toggle:hover / .icon-toggle[data-active='true'].

## 2026-01-28 – Step A (v0.0.2 snapshot)
Commands:
- git status -sb
- git tag -a v0.0.2 -m "PMD v0.0.2 - stable snapshot before local run setup"
- git push origin v0.0.2
## 2026-01-28 – Step B (CI/CD on tags)
Checked/updated workflows:
- .github/workflows/ci.yml: added tag trigger v*
- .github/workflows/release.yml: added tag trigger v* and tag image output
Image tags produced (release):
- :latest
- :<git-sha>
- :<git-tag> (when ref_type == tag, e.g. v0.0.2)
## 2026-01-28 – Step C (one command local run)
Added:
- docker-compose.local.yml (frontend, backend, mongo; mongo volume)
- README.md section "Local development - one command run" with compose command and URLs
## 2026-01-28 – Fix JWT secret in docker-compose.local.yml
- Updated PMD_JWT_SECRET to a 32+ character value to avoid WeakKeyException.
- File: docker-compose.local.yml
## 2026-01-28 – Local compose reliability (mongo + orphan cleanup)
- Updated docker-compose.local.yml to add Mongo healthcheck and gate backend on service_healthy.
- Backend now gets Mongo URI via env (SPRING_DATA_MONGODB_URI) plus SPRING_APPLICATION_JSON to avoid localhost fallback.
- Added MailHog service to local compose to prevent orphan warnings and keep dev email inbox available.
- Set local JWT secret to a safe placeholder (32+ chars, non-sensitive).
Files: docker-compose.local.yml.


- README: documented one-command run + status/logs + clean reset commands and MailHog URL.
Files: README.md.


## 2026-01-28 – Backend Mongo env precedence (docker local)
- Root cause: ackend/pmd-backend/src/main/resources/application.yml hardcoded spring.data.mongodb.uri to localhost, so Docker runs tried localhost even when env was set.
- Fix: changed spring.data.mongodb.uri to ${SPRING_DATA_MONGODB_URI} so environment is the single source of truth.
Files: ackend/pmd-backend/src/main/resources/application.yml.


- docker-compose.local.yml: added SPRING_APPLICATION_JSON to force Mongo URI override in container env (backward-compatible with older images).
Files: docker-compose.local.yml.


- PmdBackendApplication now sets spring.data.mongodb.uri system property from SPRING_DATA_MONGODB_URI at startup to guarantee env precedence over any embedded defaults.
Files: ackend/pmd-backend/src/main/java/com/pmd/PmdBackendApplication.java.


- docker-compose.local.yml: backend now launches via shell command that injects SPRING_DATA_MONGODB_URI into JVM system property to ensure Mongo host is not localhost.
Files: docker-compose.local.yml.


- docker-compose.local.yml: escaped env var in backend command with $$ so container uses its own SPRING_DATA_MONGODB_URI.
Files: docker-compose.local.yml.


- docker-compose.local.yml: override backend entrypoint to run Java with -Dspring.data.mongodb.uri so env is actually applied (image entrypoint was ignoring command args).
Files: docker-compose.local.yml.


- docker-compose.local.yml: adjusted backend entrypoint to include full command string for sh -c (avoids java running with no args).
Files: docker-compose.local.yml.


- PmdBackendApplication now parses SPRING_DATA_MONGODB_URI and sets spring.data.mongodb.uri/host/port/database system properties to avoid localhost fallback.
Files: ackend/pmd-backend/src/main/java/com/pmd/PmdBackendApplication.java.


- Added MongoConfig with explicit MongoDatabaseFactory/MongoTemplate using SPRING_DATA_MONGODB_URI (fails fast if missing).
Files: ackend/pmd-backend/src/main/java/com/pmd/config/MongoConfig.java.
- Removed temporary env parsing from PmdBackendApplication now that MongoConfig owns env resolution.
Files: ackend/pmd-backend/src/main/java/com/pmd/PmdBackendApplication.java.


- docker-compose.local.yml: removed backend entrypoint override after moving Mongo URI handling into MongoConfig (env-only).
Files: docker-compose.local.yml.


- application.yml mail config now reads SPRING_MAIL_HOST/SPRING_MAIL_PORT to avoid localhost inside Docker.
Files: ackend/pmd-backend/src/main/resources/application.yml.
- docker-compose.local.yml sets SPRING_MAIL_HOST=mailhog and SPRING_MAIL_PORT=1025 for health checks.
Files: docker-compose.local.yml.


- Reverted MongoConfig changes; backend now relies on Spring's property resolution so tests can run with default localhost URI while Docker overrides via env.
- spring.data.mongodb.uri now uses ${SPRING_DATA_MONGODB_URI:mongodb://localhost:27017/pmd} and mail host/port default to localhost unless env overrides.
Files: ackend/pmd-backend/src/main/resources/application.yml.

\n## 2026-01-28 – Expand demo seed\n- Expanded DemoSeeder to include 10 rich-tech personas plus 10 aligned projects assigned to them, still gated by dev profile or PMD_SEED_DEMO=true.\n- Added docs/demo-users.txt capturing the seeded credentials for quick logins.\n
\n- docker-compose.local.yml now sets PMD_SEED_DEMO=true and SPRING_PROFILES_ACTIVE=dev so that a fresh compose up seeds all demo users/projects for easier testing.\nFile: docker-compose.local.yml.\n

## 2026-01-28 â€“ Backend exits in Docker (Mongo localhost + JWT hardening)

Evidence (testing clone C:\Projects\PMD):
- docker compose logs show Mongo client using localhost despite env: `clusterSettings={hosts=[localhost:27017]}` followed by `MongoTimeoutException` and app exit.
- docker inspect pmd-backend shows `SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/pmd` present, so env was set but not applied by the app/image.
- Application runners `UserTeamNormalizationRunner` and `UserSeeder` were throwing on Mongo timeouts, which terminated startup.

Changes:
- `backend/pmd-backend/src/main/resources/application.yml`: JWT config now reads env (`PMD_JWT_SECRET`, `PMD_JWT_EXPIRATIONSECONDS`) instead of a hardcoded secret.
- `backend/pmd-backend/src/main/resources/application-dev.yml`: dev profile defaults Mongo URI to `mongodb://mongo:27017/pmd` (env still overrides).
- Added `JwtSecretEnvPostProcessor` to auto-generate a dev-only secret or fail fast with a clear error when secret < 32 bytes.
- Added `StartupMongoRetry` and wrapped startup runners so Mongo not-ready errors donâ€™t crash the app.
- `docker-compose.local.yml`: backend now builds from local Dockerfile; JWT secret updated to a safe 32+ byte default.

Proof references:
- Logs used: `docker compose -f docker-compose.local.yml logs --tail=300 backend`
- Inspect used: `docker inspect pmd-backend`

## 2026-01-28 â€“ Backend Mongo URI hard fix (explicit MongoConfig)

Follow-up evidence:
- After rebuild, logs show `clusterSettings={hosts=[mongo:27017]}` and successful monitor connection.
- Backend stayed up for >2 minutes and `/actuator/health` returned `{ "status": "UP" }`.

Changes:
- Added `MongoConfig` to build MongoClient/MongoTemplate directly from `SPRING_DATA_MONGODB_URI` (or spring.data.mongodb.uri), failing fast if missing.
- Added env-to-system-property bridge in `PmdBackendApplication` to ensure URI is visible to Spring config.
- Wrapped `ProjectAuthorBackfillRunner` in Mongo retry guard.

## 2026-01-28 â€“ Maven run failure (evidence)
Command:
- `./mvnw spring-boot:run -e`

Key failure:
- `io.jsonwebtoken.security.WeakKeyException: The specified key byte array is 0 bits ...`
- Root cause in trace: `JwtService.<init>` threw due to missing/empty `pmd.jwt.secret` in default profile.

Stack excerpt:
- `Error creating bean with name 'jwtService' ... Constructor threw exception`
- `WeakKeyException ... key byte array is 0 bits`

Context:
- Active profile: default (no profile set)
- This explains Maven run exit code 1 (JWT secret empty by default).

## 2026-01-28 â€“ Config audit + fixes (Mongo/JWT + project visibility)

Config sources inspected:
- `backend/pmd-backend/src/main/resources/application.yml`
- `backend/pmd-backend/src/main/resources/application-local.yml`
- `backend/pmd-backend/src/main/resources/application-docker.yml`
- `backend/pmd-backend/src/main/java/com/pmd/config/MongoConfig.java`
- `backend/pmd-backend/src/main/java/com/pmd/config/JwtSecretEnvPostProcessor.java`
- `docker-compose.local.yml`
- `docker-compose.prod.yml`
- `frontend/pmd-frontend/src/api/http.ts`

Changes made:
- Default profile set to `local` so `./mvnw spring-boot:run` uses localhost Mongo + auto JWT secret.
- Added `application-local.yml` (mongodb://localhost:27017/pmd) and `application-docker.yml` (mongodb://mongo:27017/pmd).
- Compose now uses `SPRING_PROFILES_ACTIVE=docker` and keeps Mongo URI via env.
- Frontend API base now reads `VITE_API_BASE_URL` with fallback to `http://localhost:8080`.
- Removed non-admin filter that hid admin-authored projects from `/api/projects` and `/api/projects/{id}` so seeded projects are visible.

## 2026-01-28 â€“ Maven run retry (local profile)
- `./mvnw spring-boot:run -e` now uses default profile `local` and auto-generates a JWT secret (log: "PMD_JWT_SECRET is missing or too short; auto-generating a local-only secret.").
- Mongo connects to `localhost:27017` via `application-local.yml`.
- The last failure was due to port conflict (port already in use), not JWT/Mongo.
- JWT default/validation now handled in `JwtService` (local/dev auto-generate, non-local fail fast); removed `EnvironmentPostProcessor` registration.
- API smoke test (Docker): login with admin1@pmd.local succeeded; GET /api/projects returned 10 projects (seed visible).

## 2026-01-28 â€“ Deterministic profiles/ports/JWT
- local profile is now default with server.port=8099 and stable dev JWT secret in application-local.yml (no random secret per run).
- docker profile sets server.port=8080, mongo uri mongo:27017, and requires PMD_JWT_SECRET (>=32 chars).
- Added JwtProperties validation and PortInfoLogger to print port + override instructions.
- Startup seeders now retry up to ~60s before skipping (StartupMongoRetry updated; DemoSeeder wrapped).
- Frontend API base now defaults to 8099 in dev (Vite), 8080 in production, with VITE_API_BASE_URL override.

## 2026-01-29 - Teams feature (decisions + contracts)

Decisions:
- Teams are a first-class collection; IDs are used for all filtering.
- Admin role is stored on user.isAdmin (no longer inferred from team name).
- Non-admin users cannot see admin users; enforcement is server-side.

API contracts:
- GET /api/teams -> active teams list (auth not required for register flow).
- POST /api/teams (admin only) -> create team, validates unique name + slug.
- PATCH /api/teams/{id} (admin only, optional) -> rename/disable team.

Seed behavior:
- Default teams are inserted if missing (safe to re-run; no duplicates).
- Default list: Web Development, Software Engineering, Network Engineering, Cybersecurity, DevOps, QA / Testing, Data Engineering, Project Management, UX / UI Design, IT Support / Helpdesk.

Data handling:
- Users/projects now store teamId; responses also include teamName for display.
- Legacy users with team string are normalized to teamId when matching a team name/slug.

## 2026-01-29 - Backend appears down but UI still works (investigation)

Evidence collected:
- docker compose ps (local) shows only mongo + mailhog running.
- docker ps / docker ps -a show pmd-backend and pmd-frontend exited (ExitCode 255). Backend only appears in `docker ps -a` because it is not running.
- docker logs pmd-backend show successful startup on port 8080, then container later exited without restart (RestartCount=0).
- docker inspect pmd-backend: Status=exited, ExitCode=255, OOMKilled=false, RestartCount=0, SPRING_PROFILES_ACTIVE=docker, Mongo URI=mongodb://mongo:27017/pmd.

Frontend behavior (why UI can look "alive"):
- No MSW/service worker or mock layer found in repo.
- API base URL comes from `VITE_API_BASE_URL` or defaults to http://localhost:8099 (dev) / http://localhost:8080 (prod).
- UI keeps previous in-memory users/projects; when backend goes down, fetch errors only set error text and do not clear lists, so pages still render old data.
- Local storage only stores auth token; no cached data store, so the “working” effect is from stale in-memory state.

Port diagnostics (Windows):
- 5173 is held by node.exe (PID 28436) – likely local dev frontend.
- 27017 + 8025 are bound by com.docker.backend.exe (Docker Desktop) and wslrelay.exe.
- 8080 is currently free (no listener). This matches backend container being exited.

Root causes:
1) Docker backend/frontend containers are stopped/exited, so the UI served by local node dev server keeps old data in memory.
2) Frontend does not surface a global “backend unreachable” state or clear stale data on network failure.
3) Compose port bindings are fixed; no structured way to avoid port conflicts.

Fixes implemented:
- Frontend now logs the resolved API base URL on startup.
- request layer emits pmd:offline/pmd:online events; App shows a clear “Backend unreachable” banner and clears stale users/projects on offline.
- docker-compose.local.yml now uses .env-driven ports (PMD_*_PORT) and adds healthchecks.
- Backend Dockerfile installs curl so healthcheck can call /actuator/health.
- Added scripts/diagnose-ports.ps1 for consistent Windows port conflict checks.

How to reproduce (pre-fix):
1) Start frontend (npm run dev) and login, load dashboard.
2) Stop backend.
3) UI still shows projects/people from previous in-memory state.

How to verify (post-fix):
- Stop backend; UI should show “Backend unreachable” banner and not render stale lists.
- Restore backend; UI should recover and refetch.

## 2026-01-29 - Docker health verification + ExitCode=255 root cause

Verification results:
- `docker compose -f docker-compose.local.yml up -d --build` succeeded after fixes.
- `docker compose -f docker-compose.local.yml ps` shows backend healthy.
- `curl http://localhost:8080/actuator/health` returns UP.
- `curl http://localhost:8080/api/teams` returns 10 teams.

Root cause of build/exit during docker up:
- Backend image build failed due to compilation errors, so the container never started.
- Error #1: `StatsService.normalizeTeam(...)` missing method. Fixed by adding the helper.
- Error #2: TeamIntegrationTest used `@AutoConfigureMockMvc`, but test classpath lacked that package in Docker build. Fixed by creating MockMvc via WebApplicationContext (removed AutoConfigureMockMvc annotation) to avoid missing dependency.

Current state:
- Backend now builds and stays healthy in Docker mode (no ExitCode=255 observed after fix).

## 2026-01-29 - Docker evidence blocked (engine not running)

Attempted required Docker evidence collection, but Docker Desktop/WSL2 engine was not available:
- `docker compose -f docker-compose.local.yml down --remove-orphans` failed: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.`

Action needed:
- Start Docker Desktop, then re-run the required evidence commands.

## 2026-01-29 - Register redirect + UI selection persistence audit

Diagnosis
- Register flow already sets `showSuccess` and schedules `onSwitchToLogin()` after 2.5s in `RegisterForm`.
- No navigation occurs in `App.handleRegister`; redirect depends on `RegisterForm`’s timer and button.
- UI state persistence: selections were kept only in memory; Dashboard/Assign shared a single `selectedProjectId` in App; People kept `selectedUserId` + filters in component state. No localStorage/sessionStorage for selections.

Changes
- Added Settings page with 3 toggles for selection persistence (localStorage, non-sensitive).
- Split Dashboard vs Assign selected project state in App.
- Added sessionStorage-backed selection store (per session) with clear/reset on logout.
- Added People selection/filter persistence gated by Settings toggle.
- Logout/login now clears all UI selections and session-persisted state.

Files
- frontend/pmd-frontend/src/ui/uiPreferences.ts
- frontend/pmd-frontend/src/ui/uiSelectionStore.ts
- frontend/pmd-frontend/src/components/SettingsPage.tsx
- frontend/pmd-frontend/src/components/PeoplePage.tsx
- frontend/pmd-frontend/src/App.tsx
- frontend/pmd-frontend/src/App.css

## 2026-01-29 - PMD Docker inventory + restart policy

Docker inventory
- docker compose ls: no PMD compose project listed (only Docker Desktop extensions).
- docker ps -a shows PMD containers (all exited): pmd-frontend, pmd-backend, pmd-mongo, pmd-mailhog.
- docker networks: pmd_default, pmd_pmd-net present.
- docker volumes: pmd_mongo_data, pmd_pmd_mongo_data, pmd_pmd_sqlserver_data present.

Restart policy (per container)
- pmd-backend: restart policy = no
- pmd-frontend: restart policy = no
- pmd-mongo: restart policy = no
- pmd-mailhog: restart policy = no

## 2026-01-29 - PMD docker cleanup + scripts

Actions taken
- Stopped and removed PMD containers: pmd-backend, pmd-frontend, pmd-mongo, pmd-mailhog.
- Removed PMD networks: pmd_default, pmd_pmd-net.
- Removed PMD volumes: pmd_mongo_data, pmd_pmd_mongo_data, pmd_pmd_sqlserver_data.
- Added fixed compose project name via `name: pmd` in docker-compose.local.yml.
- Added scripts: scripts/preflight.ps1, scripts/pmd-start.ps1, scripts/pmd-stop.ps1, scripts/pmd-reset.ps1 with guard against C:\Projects\PMD.
- Updated README to use scripts and warn against running compose in C:\Projects\PMD.

## 2026-01-29 - Rollback guard scripts

Action
- Removed guard scripts (preflight + pmd-start/stop/reset) per user request.
- Restored README local compose commands (no script references).
- Note: we will manually avoid running anything from the clone unless explicitly asked.

## 2026-01-29 - Manual-only Docker start/stop

Findings
- restart policy found in docker-compose.yml and docker-compose.prod.yml: unless-stopped.
- docker-compose.local.yml has no restart policy.

Changes
- Removed restart policies from docker-compose.yml and docker-compose.prod.yml.
- Added optional wrapper scripts (no guards): scripts/pmd-start.ps1, scripts/pmd-stop.ps1, scripts/pmd-reset.ps1.

Manual workflow (documented)
- Start: docker compose -f docker-compose.local.yml up -d --build
- Stop: docker compose -f docker-compose.local.yml down --remove-orphans
- Reset: docker compose -f docker-compose.local.yml down -v --remove-orphans

## 2026-01-29 - Backend/Frontend inventory (Step 1)

Backend API inventory (controllers)
| Endpoint | Purpose | DTOs | Auth | Workspace impact |
|---|---|---|---|---|
| POST /api/auth/login | Login | LoginRequest -> LoginResponse | Public | TBD |
| POST /api/auth/register | Register + email token | RegisterRequest -> LoginResponse | Public | TBD |
| GET /api/auth/me | Current user | UserResponse | User | TBD |
| PUT /api/auth/me | Update profile | UpdateProfileRequest -> UserResponse | User | TBD |
| PATCH /api/auth/me/people-page-widgets | Save people widgets | PeoplePageWidgetsRequest -> PeoplePageWidgets | User | TBD |
| GET /api/auth/confirm?token=... | Confirm email | ConfirmEmailResponse | Public | TBD |
| GET /api/projects | List projects | ProjectResponse[] | User | TBD |
| POST /api/projects | Create project | ProjectRequest -> ProjectResponse | User | TBD |
| GET /api/projects/{id} | Project detail | ProjectResponse | User | TBD |
| PUT /api/projects/{id} | Update project | ProjectRequest -> ProjectResponse | User | TBD |
| DELETE /api/projects/{id} | Delete project | none | User | TBD |
| GET /api/projects/my-stats | My dashboard stats | DashboardStatsResponse | User | TBD |
| POST /api/projects/random | Random project | RandomProjectRequest -> ProjectResponse | User | TBD |
| POST /api/projects/{id}/random-assign | Random assign | RandomAssignRequest -> RandomAssignResponse | User | TBD |
| GET /api/projects/{projectId}/comments | List comments | ProjectCommentItemResponse[] | User | TBD |
| POST /api/projects/{projectId}/comments | Add comment | ProjectCommentCreateRequest -> ProjectCommentItemResponse | User | TBD |
| POST /api/comments/{commentId}/reactions | Toggle reaction | ProjectCommentReactionRequest -> ProjectCommentItemResponse | User | TBD |
| DELETE /api/comments/{commentId} | Delete comment | none | User | TBD |
| GET /api/users | People directory (users) | UserSummaryResponse[] | User | TBD |
| POST /api/people | Create person | PersonRequest -> PersonResponse | User | TBD |
| GET /api/people | List people | PersonResponse[] | User | TBD |
| GET /api/people/{id} | Person detail | PersonResponse | User | TBD |
| POST /api/people/{id}/recommendations/toggle | Recommend toggle | RecommendationToggleResponse | User | TBD |
| GET /api/people/{id}/recommendations | Recommendation list | UserSummaryResponse[] | User | TBD |
| GET /api/people/recommended | Recommended people | UserSummaryResponse[] | User | TBD |
| GET /api/stats/dashboard | Workspace stats | WorkspaceDashboardStatsResponse | User | TBD |
| GET /api/stats/user/me | My stats | UserStatsResponse | User | TBD |
| GET /api/stats/user/{id} | User stats | UserStatsResponse | User | TBD |
| GET /api/stats/people/overview | People overview | PeopleOverviewStatsResponse | User | TBD |
| GET /api/stats/people/{id} | Person stats | PeopleUserStatsResponse | User | TBD |
| GET /api/teams | List teams | TeamResponse[] | Public | TBD |
| POST /api/teams | Create team | TeamRequest -> TeamResponse | Admin | TBD |
| PATCH /api/teams/{id} | Update team | TeamUpdateRequest -> TeamResponse | Admin | TBD |
| POST /api/uploads | Upload file | UploadResponse | User | TBD |

Frontend routes + API usage
- /dashboard -> projects list/update/delete; comments; random not used here; users list for assignment; teams list; no stats endpoint usage.
- /assign -> projects list/update/delete; random project/assign; users list + recommendations; teams list; comments via ProjectDetails.
- /people -> users list; people stats endpoints; recommendations; teams list.
- /admin -> users list; teams create (admin).
- /profile -> update profile.
- /settings -> UI-only preferences.
- /login,/register,/confirm-email -> auth endpoints.

Feature Coverage Matrix (backend -> frontend)
| Endpoint | UI Covered | Screen | Notes |
|---|---|---|---|
| /api/auth/* | Yes | Login/Register/Profile/Confirm | Register auto-redirect still to verify |
| /api/projects (CRUD) | Yes | Dashboard/Assign/ProjectDetails | Full CRUD via UI |
| /api/projects/my-stats | No | — | Backend-only currently |
| /api/projects/random | Yes | Assign | Random project |
| /api/projects/{id}/random-assign | Yes | Assign | Random assign |
| /api/projects/{id}/comments | Yes | ProjectDetails/Comments | List/create |
| /api/comments/{id}/reactions | Yes | ProjectComments | Toggle reaction |
| /api/comments/{id} DELETE | Yes | ProjectComments | Delete comment |
| /api/users | Yes | Dashboard/Assign/People/Admin | Directory + assignment |
| /api/people (CRUD) | No | — | PersonController not used in UI |
| /api/people/*/recommendations | Yes | Assign/People | Toggle + list |
| /api/people/recommended | Yes | Assign/People | Recommended pool |
| /api/stats/dashboard | No | — | Stats endpoint unused |
| /api/stats/user/me | No | — | Unused |
| /api/stats/user/{id} | No | — | Unused |
| /api/stats/people/overview | Yes | People | Overview charts |
| /api/stats/people/{id} | Yes | People | Selected user stats |
| /api/teams | Yes | Register/Create Project/Admin | List teams |
| /api/teams POST/PATCH | Yes (POST) / No (PATCH) | Admin/Create Project | Update team not exposed |
| /api/uploads | Yes | ProjectComments | Upload attachment |

Gaps (backend-only or unused)
- /api/people (CRUD) not surfaced.
- /api/stats/dashboard, /api/stats/user/me, /api/stats/user/{id} unused.
- /api/projects/my-stats unused.
- /api/teams/{id} PATCH not exposed.

Next steps for Step 2+: decide which gaps to implement vs document as backend-only.

## 2026-01-29 - Gap closures (Step 3)

Implemented UI coverage
- /api/people (CRUD): People records section on People page (admin create/edit/delete; list for all auth).
- /api/teams/{id} PATCH: Admin Panel -> Teams list inline edit.
- /api/stats/dashboard: Dashboard "Workspace summary" card.
- /api/stats/user/me: Profile "My stats" card.
- /api/projects/my-stats: Profile "My dashboard stats" card.

Backend-only (explicit)
- /api/stats/user/{id}: Not exposed yet; People page already uses /api/stats/people/{id} for detailed user stats. Leave as backend-only for now.

Naming standard (update)
- People = "Person" records from /api/people (admin-managed).
- Users = accounts from /api/users (directory/assignments).
- API client naming: listPeople/createPerson/updatePerson/deletePerson; fetchDashboardStats; fetchMyUserStats; fetchMyDashboardStats.

## 2026-01-29 - Toast notifications + auth form layout fix

Diagnosis
- Register/Login rendered global error banners inside the auth form layout (authError from App), causing layout shifts.
- Register validation relied on a single global error; per-field errors were not shown, so the banner fired even when fields were filled incorrectly.

Changes
- Added a lightweight toast overlay system (frontend/pmd-frontend/src/shared/ui/toast/ToastProvider.tsx) and wired it in frontend/pmd-frontend/src/main.tsx.
- Register + Login now show toasts for global errors and use per-field inline errors with reserved space (.field-error) to avoid layout jump.
- Removed layout-breaking global error banners from auth forms.

## 2026-01-29 - Workspace foundation evidence (pre-change)

Auth/register DTO
- backend/pmd-backend/src/main/java/com/pmd/auth/dto/RegisterRequest.java: fields include team + teamId + bio.
- backend/pmd-backend/src/main/java/com/pmd/auth/controller/AuthController.java: register requires teamId or team name; resolveTeam throws 400 if missing and 404/422 if not found/inactive.
- frontend/pmd-frontend/src/api/auth.ts sends teamId in register payload.

Teams domain today
- backend/pmd-backend/src/main/java/com/pmd/team/model/Team.java: global Team collection with unique name + slug (no workspaceId).
- backend/pmd-backend/src/main/java/com/pmd/team/service/TeamSeeder.java: seeds 10 default teams globally (no workspace scoping).
- backend/pmd-backend/src/main/java/com/pmd/user/service/UserTeamNormalizationRunner.java: normalizes user.team/teamId based on global teams.

Teams source in UI
- frontend/pmd-frontend/src/teams/TeamsContext.tsx loads /api/teams (global) and provides the list for Register/Create Project/Admin.

## 2026-01-29 - Workspace Stage A (backend domain + endpoints)

Design decision
- Workspace context will be path-scoped: /api/workspaces/{workspaceId}/... (clear URLs, avoids missing header bugs).

Implemented (backend only)
- Added Workspace domain models: Workspace, WorkspaceMember (role/status), WorkspaceInvite.
- Added Workspace endpoints:
  - POST /api/workspaces (create, creator becomes OWNER)
  - GET  /api/workspaces (list current user memberships)
  - POST /api/workspaces/join (join via invite token)
- Membership is stored in workspace_members and enforced for list/join at service level.

Notes
- Invites are required for join; invite creation UI/API will be added later.
- Demo workspace support and tenant scoping for core entities are next stages.

## 2026-01-29 - Workspace Stage B (tenant scoping core entities)

Changes (backend)
- Added workspaceId to Team, Person, Project; updated DTOs (TeamResponse, PersonResponse, ProjectResponse).
- Scoped endpoints under /api/workspaces/{workspaceId}/... for teams, people, users, projects, comments, and stats.
- Enforced workspace membership checks in controllers (WorkspaceService.requireActiveMembership).
- Updated services/repositories to filter by workspaceId and prevent cross-workspace assignments.
- Disabled legacy normalization/backfill runners that relied on global teams/users.

Notes
- Auth/register no longer validates team; team fields are accepted but not resolved (temporary until onboarding is updated).
- Demo seeding updated to avoid workspace team resolution; full demo workspace seeding comes in Stage C.

## 2026-01-29 - Workspace Stage C (demo workspace)

Implemented (backend)
- Added Workspace demo flag and API endpoints:
  - POST /api/workspaces/demo -> create or return demo workspace for the user (slug demo-{userId}).
  - POST /api/workspaces/{id}/demo/reset -> purge workspace data and reseed (demo-only).
- Added DemoWorkspaceSeeder to reset + seed demo data per workspace (teams, demo users, people records, projects).
- Demo reset is guarded (workspace must be demo; requester must be owner/admin).

Notes
- Demo users are created with unique emails scoped by workspaceId (demo123! password), and added as members.
- Demo seed is idempotent per workspace and safe to rerun after reset.

## 2026-01-29 - Workspace Stage D/E (frontend wiring + UX)

What changed
- App is gated by workspace selection: authenticated users without an active workspace see WorkspacePicker instead of being redirected to login.
- Workspace switcher added to top bar; active workspace persisted via localStorage key `pmd_active_workspace_id` (cleared on logout).
- WorkspacePicker added (create/join/enter demo) and styled in App.css.
- All workspace-scoped API calls wired across UI: Dashboard, Assign, People, Profile, ProjectDetails, ProjectComments, CreateProjectForm.
- Settings page now includes Demo Workspace controls (enter + reset). Reset triggers a data refresh (pmd:workspace-reset event) and teams refresh.
- Added “Join a team” banner when user has no team in the active workspace; Admins get a quick link to create a team.
- Required fields in Login/Register show a subtle * indicator.

Files touched
- frontend/pmd-frontend/src/App.tsx
- frontend/pmd-frontend/src/App.css
- frontend/pmd-frontend/src/components/WorkspacePicker.tsx
- frontend/pmd-frontend/src/components/SettingsPage.tsx
- frontend/pmd-frontend/src/components/DashboardPage.tsx
- frontend/pmd-frontend/src/components/AssignPage.tsx
- frontend/pmd-frontend/src/components/PeoplePage.tsx
- frontend/pmd-frontend/src/components/ProfilePanel.tsx
- frontend/pmd-frontend/src/components/CreateProjectForm.tsx
- frontend/pmd-frontend/src/components/ProjectDetails.tsx
- frontend/pmd-frontend/src/components/ProjectComments.tsx
- frontend/pmd-frontend/src/components/LoginForm.tsx
- frontend/pmd-frontend/src/components/RegisterForm.tsx

Verification (manual)
- Login -> WorkspacePicker appears if no active workspace -> create workspace -> app loads.
- Workspace switcher changes data scope (projects/people/teams update per workspace).
- Demo: Enter Demo Workspace -> seeded data appears; Reset demo -> data returns to baseline.
- Logout clears auth + workspace selection; re-login starts clean.
- Frontend lint: `npm run lint` passes after workspace wiring.

## 2026-01-29 - Compose run (post-workspace wiring)

- docker compose -f docker-compose.local.yml up -d --build: succeeded after fixes.
- Backend compile fixes:
  - WorkspaceService demo workspace lambda now uses finalWorkspace to satisfy effectively-final rule.
  - ProjectServiceTest updated for workspace-scoped method signatures.
- `docker compose -f docker-compose.local.yml ps` shows backend healthy.
- `curl http://localhost:8080/actuator/health` -> UP.

## 2026-01-29 - Frontend image evidence (workspace UI missing)

Evidence
- `docker compose -f docker-compose.local.yml ps` shows frontend running image ghcr.io/wannabexaker/pmd-frontend:latest (unhealthy).
- `docker inspect pmd-frontend` -> Image=ghcr.io/wannabexaker/pmd-frontend:latest, Mounts=[] (static image, not local code).
- `docker exec pmd-frontend sh -lc "cat /etc/nginx/conf.d/default.conf"` confirms Nginx static build serving /usr/share/nginx/html assets.

Conclusion
- Frontend container is serving a static GHCR image, not local workspace-aware code.

Change
- docker-compose.local.yml now builds frontend from local source (context ./frontend/pmd-frontend) using image pmd-frontend-local.

## 2026-01-29 - Frontend local build + workspace UI fix

Compose changes
- docker-compose.local.yml frontend now builds from ./frontend/pmd-frontend and uses image pmd-frontend-local (no GHCR dependency for dev).

Build fixes
- DashboardPage: ensure draft project payloads include teamId (CreateProjectPayload requires it).
- SettingsPage: toast API uses object payload (type/message) instead of positional args.

Verification commands
- docker compose -f docker-compose.local.yml down --remove-orphans
- docker compose -f docker-compose.local.yml up -d --build
- docker compose -f docker-compose.local.yml ps (frontend now shows image pmd-frontend-local)

Evidence outputs (Step A)
- docker compose -f docker-compose.local.yml ps:
  pmd-frontend image ghcr.io/wannabexaker/pmd-frontend:latest (unhealthy)
- docker inspect pmd-frontend:
  Image=ghcr.io/wannabexaker/pmd-frontend:latest
  Mounts=[]
- docker exec pmd-frontend sh -lc "cat /etc/nginx/conf.d/default.conf && ls -la /usr/share/nginx/html | head":
  root /usr/share/nginx/html; index index.html; (nginx static)
  index.html + assets present under /usr/share/nginx/html

## 2026-01-29 - Hybrid local dev workflow (deps in Docker, FE/BE local)

Added
- docker-compose.deps.yml (mongo + mailhog only).
- docs/DEV-HYBRID.md (hybrid dev instructions).
- backend/pmd-backend/.env.example and frontend/pmd-frontend/.env.example.
- scripts: pmd-deps-up/down/reset, pmd-backend-dev, pmd-frontend-dev, pmd-dev.

Notes
- docker-compose.local.yml remains for full dockerized app; hybrid is default local path.

## 2026-01-29 - Hybrid dev .bat wrappers

Added optional .bat wrappers for PowerShell scripts in scripts/.

## 2026-01-29 - Script naming cleanup

Renamed scripts to use pmd_up_ / pmd_down_ prefix for clarity (e.g. pmd_up_deps, pmd_up_backend_dev, pmd_up_frontend_dev, pmd_up_dev).
Updated docs/DEV-HYBRID.md accordingly.

## 2026-01-29 - Workspace management in Settings + last workspace

Updates
- Added Workspaces panel in Settings (current workspace, create, join via token/link, demo enter/reset).
- Join accepts token or full URL containing ?token= and extracts token.
- Active workspace persists to localStorage key `pmd:lastWorkspaceId` (migrates legacy key on read).
- Logout/unauthorized clears `pmd:lastWorkspaceId` and workspace state.
- Sidebar nav is disabled when no active workspace (redirects to Settings).
- Routes redirect to Settings when no workspace is selected.

Verification steps
- Login -> if last workspace exists, auto-selects it; otherwise lands in Settings.
- Settings -> create/join/demo works and selects workspace.
- No workspace: Dashboard/Assign/People/Admin/Profile links are disabled and send to Settings.
- Logout clears last workspace key.

## 2026-01-29 - Frontend polish (settings/workspaces, create project, assign)

- Settings: merged Demo + Workspaces into one Workspaces section with Demo workspaces and Your workspaces groups; demo actions moved inside demo group; list area scrollable.
- Settings: current workspace shows Current badge; demo entries show Demo badge.
- Create Project: compact layout (max-width, tighter gaps, description rows).
- Assign: removed duplicate-looking team filter by renaming random scope dropdown; auto-hide self-recommend error after 5s.

## 2026-01-29 - Workspace invites + approvals + People copy

Backend
- Added WorkspaceInvite fields (code, maxUses, usesCount, revoked) + WorkspaceJoinRequest model.
- New workspace endpoints:
  - POST /api/workspaces/{id}/invites
  - GET /api/workspaces/{id}/invites
  - POST /api/workspaces/{id}/invites/{inviteId}/revoke
  - POST /api/workspaces/invites/resolve
  - GET /api/workspaces/{id}/requests
  - POST /api/workspaces/{id}/requests/{rid}/approve
  - POST /api/workspaces/{id}/requests/{rid}/deny
  - PATCH /api/workspaces/{id}/settings (requireApproval)
- Join flow: if requireApproval=true, membership becomes PENDING and a join request is created.
- Invite defaults: expiresAt +7 days, maxUses defaults to 10 if not provided.

Frontend
- Settings -> Workspaces:
  - Invite management (create, list, copy link/code, revoke).
  - Join approval toggle (admin/owner).
  - Pending requests list (admin/owner).
  - Join accepts token, code, or full link (?invite= or ?token=).
  - Pending status badge in workspace lists.
- Active workspace persistence key is now `pmd.activeWorkspaceId` (legacy keys are migrated/cleared).
- People page copy: non-admin sees "Workspace members"; admin-only "People records" section.
- People records API now only fetched for admins (avoids 403 for members).

Verification steps (manual)
- Admin: create invite -> copy link/code -> revoke works.
- Member: paste link/code -> join; if approval required, sees Pending badge and cannot enter.
- Admin: approve/deny pending requests and member becomes active.
- Login remembers last active workspace; logout clears key.
- People page: non-admin copy has no admin/internal text.

## 2026-01-30 - Runtime port/communication audit (hybrid vs docker)

Observed runtime (local machine)
- No docker compose stacks running (deps/local compose both empty).
- Ports listening: 5173 (node.exe Vite), 8080 (svchost.exe). No listeners on 8099/27017/1025/8025.
- Backend log showed Mongo connection refused because Mongo was not running.

Expected wiring (professional baseline)
Hybrid dev (recommended):
- Frontend: http://localhost:5173
- Backend: http://localhost:8099 (Spring profile local)
- MongoDB: localhost:27017 (Docker deps)
- MailHog SMTP: localhost:1025 (Docker deps)
- MailHog UI: http://localhost:8025
Flow: FE -> BE (8099), BE -> Mongo (27017), BE -> SMTP (1025).

Dockerized app (docker-compose.local.yml):
- Frontend: http://localhost:5173 (container :80)
- Backend: http://localhost:8080 (container :8080)
- Mongo/MailHog: 27017/1025/8025
Note: 8080 is occupied by svchost on this machine; use PMD_BACKEND_PORT override if running docker compose.

Adjustments made
- Align hybrid docs + scripts to 8099 (docs/DEV-HYBRID.md, scripts/pmd_up_*).
- Frontend env example now uses 8099.

Next manual checks
- Start deps: scripts\pmd_up_deps.ps1
- Start backend: scripts\pmd_up_backend_dev.ps1
- Start frontend: scripts\pmd_up_frontend_dev.ps1
- Verify: curl.exe -s http://localhost:8099/actuator/health

## 2026-01-30 - User manual + port cleanup

Changes
- Added docs/USER-MANUAL.md with indexed instructions for hybrid vs dockerized runs, ports, scripts, status checks, debug flow, and resets.
- Updated legacy scripts under scripts/pmd to point to hybrid scripts and backend port 8099.
- Updated README example for VITE_API_BASE_URL and clarified backend port for hybrid vs docker.

Notes
- Hybrid backend runs on 8099 (application-local.yml). Dockerized backend runs on 8080.
- If dockerized backend conflicts on 8080, set PMD_BACKEND_PORT in repo root .env.

## 2026-01-30 - Vite parse error (WorkspaceContext)

Root cause
- Extra `else { ... }` block in refresh() caused a mismatched if/else, triggering `[plugin:vite:react-babel] Unexpected token` around line ~114.

Fix
- Removed the stray duplicate else block, keeping the original control flow unchanged.
- File: frontend/pmd-frontend/src/workspaces/WorkspaceContext.tsx
