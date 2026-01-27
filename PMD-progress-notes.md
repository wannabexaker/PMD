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
