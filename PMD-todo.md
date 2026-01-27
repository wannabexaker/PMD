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
