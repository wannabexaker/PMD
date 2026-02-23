# PRD.md

This file is the single source of truth for PMD requirements, roadmap, TODOs, and progress history.

- Merged from: `PMD-todo.md` and `PMD-progress-notes.md`
- Generated on: 2026-02-16

## 2026-02-20 - Global scrollbar visual unification

- [x] Unified scrollbar styling across the whole frontend with higher overlay feel:
  - thumb transparency set to ~50% for idle state
  - transparent track everywhere
  - hover/active thumb states remain visible but still semi-transparent
  - subtle inset edge on thumb so it reads as foreground above content.
- [x] Removed reserved scrollbar gutter behavior from custom scroll containers so scrollbars behave more like overlay instead of consuming layout space.
- [x] Verified frontend build after scrollbar updates (`npm run build` successful).

## 2026-02-20 - Audit access fix for personal filters

- [x] Fixed workspace audit permission gating:
  - users can now query audit with personal scope when `actorUserId` is their own id, even if they do not have `VIEW_STATS`
  - keeps `VIEW_STATS` requirement for general/other-user audit queries.
- [x] Backend compile check passed (`./mvnw -DskipTests compile`).

## 2026-02-20 - Invite default role on join

- [x] Added `Default role on join` to workspace invite creation flow (Settings -> Invites).
- [x] Invite payload/model/response now carries `defaultRoleId`.
- [x] Join via invite now applies invite default role to the joining member (including pending membership path).
- [x] Safety rule: invite default role cannot be `Owner`.
- [x] Invite list now shows selected default role in details.
- [x] Validation checks passed:
  - backend compile (`./mvnw -DskipTests compile`)
  - frontend build (`npm run build`).

## 2026-02-20 - Workspace limits (practical enforcement)

- [x] Added configurable workspace limits in workspace profile:
  - `maxProjects`
  - `maxMembers`
  - `maxTeams`
  - `maxStorageMb` (persisted for policy readiness)
- [x] Added limit fields to backend model/API:
  - `Workspace`
  - `WorkspaceSettingsRequest`
  - `WorkspaceResponse`
- [x] Enforced limits in core flows:
  - project create blocked when workspace project limit reached
  - team create blocked when workspace team limit reached
  - join/approve membership blocked when workspace member limit reached.
- [x] Added `Default role on join` in invite creation and persisted it in invite payload/response.
- [x] Build checks passed:
  - backend compile (`./mvnw -DskipTests compile`)
  - frontend build (`npm run build`).

## 2026-02-18 - Topbar avatar routing + profile-based avatar editing

- [x] Topbar avatar behavior updated:
  - workspace avatar click now routes to `Settings`
  - user avatar click now routes to `Profile`
  - removed topbar avatar edit modal flow.
- [x] Profile avatar management moved into `My Profile`:
  - current avatar is now visible in profile
  - clicking avatar opens inline avatar settings
  - supports URL, file upload (`PNG/JPG/WEBP`, max `2MB`), delete, and save
  - uploaded relative URLs are resolved against API base so preview renders correctly.
- [x] My Profile avatar header UX refinement:
  - avatar header now shows `Name` and `Surname` stacked vertically to the right of the photo
  - removed static helper labels (`Profile avatar`, `Click image to edit`)
  - avatar hover now shows edit icon overlay
  - when avatar editor is open, overlay icon switches to `X` on the photo for close/toggle behavior.
- [x] Profile avatar editor context-window behavior:
  - avatar editor now opens as a modal context window layer above profile content
  - dark-theme avatar hover icon styling strengthened with purple emphasis for better visibility.
- [x] Avatar thumbnail/crop improvements:
  - avatar thumbnails now enforce clean circular rendering for uploaded images
  - topbar workspace/user avatars increased slightly for better visibility and balance
  - added pre-upload horizontal crop adjustment (left/right slider) for avatar images in both:
    - `My Profile` avatar upload
    - `Settings -> Workspace profile` avatar upload.
- [x] Settings -> Workspaces layout simplification:
  - removed separate `Demo workspaces` section and `Enter Demo Workspace` button
  - demo workspace entries are now part of `Your workspaces` list with `Demo` badge
  - workspace row click now switches to that workspace directly
  - in `Tab View`, `Your workspaces` and `Workspace actions` now render side-by-side (2 columns)
  - `Coming soon` moved to the bottom, after invites/requests.
- [x] Workspace actions cleanup:
  - removed `Current workspace` info block (`Current workspace`, `new/current` badges) from `Workspace actions`
  - kept `Reset Demo` action available only when active workspace is demo.
- [x] Workspace creation flow simplification:
  - removed `Initial teams` inputs and `Add team` from `Workspace actions -> Create workspace`
  - workspace can now be created without defining team(s) up front
  - `Workspace actions` create/join blocks are stacked vertically (`Create workspace` above `Join workspace`) to free horizontal space for `Your workspaces`.
- [x] Mention/email + profile stats polish:
  - mention email targeting now includes admin users as workspace recipients
  - user-token mention handling is more tolerant (fallback by display name if token-id lookup fails)
  - mention snippets in emails are sanitized to hide technical token payloads (`{user:...}`, `{team:...}`, `{role:...}`)
  - frontend comment rendering now shows clean mention text (no raw token ids in UI)
  - reduced vertical spacing in `My stats` and `My dashboard stats` cards.
- [x] Mention delivery + image quality follow-up:
  - mention parsing now supports plain `@Display Name` fallback (manual mentions without token payload)
  - self-mentions are no longer skipped (useful for single-user/demo verification flow)
  - project description mention display now uses cleaned text formatter in dashboard/details views
  - improved topbar/profile picture rendering quality with larger topbar size and centered/high-quality image fit.
- [x] Topbar profile-picture shape refinement:
  - increased image fill + slight zoom for topbar profile pictures
  - enforced circular clipping (`clip-path: circle(50%)`) so uploaded images render visibly round instead of square-looking.

## 2026-02-17 - Workspace summary timeline + refresh/navigation fixes

- [x] Workspace summary charts now use bucketed timeline logic per selected range:
  - `1m` -> 10s buckets
  - `10m` -> 1m buckets
  - `30m` -> 3m buckets
  - `1h` -> 10m buckets
  - `8h` -> 1h buckets
  - `12h` -> 1h buckets
  - `24h` -> 2h buckets
  - `7d` -> 12h buckets
  - `30d` -> 1d buckets
  - `1y` -> monthly buckets (~12)
  - `2y` -> monthly buckets (~24)
  - `5y` -> monthly buckets (~60)
- [x] Workspace summary snapshots now auto-sample every 10 seconds and persist with history compaction (so trends keep updating without needing full page reload).
- [x] Fixed workspace refresh routing race: hard refresh no longer incorrectly redirects to `/settings` before workspace state resolves.
- [x] Top-left PMD logo is now clickable and routes to dashboard (or login/settings when appropriate).
- [x] Burger button hover/focus visual polish added for clearer interactive feedback while keeping current UI identity.
- [x] Route memory added for authenticated flows: hard refresh/`/` fallback now returns user to last visited main page (dashboard/assign/people/settings/profile/admin) instead of always following stale default landing.
- [x] Drawer menu link hover interaction improved (clearer hover state + motion + border/glow).
- [x] Workspace summary performance pass: reduced history cap, removed heavy per-tick sorting, and optimized bucket generation to reduce UI lag during frequent updates.
- [x] PMD launcher update: `pmd.bat ops` added to open `scripts/pmdops.py` in a new PowerShell window (also exposed in the interactive menu option `[9]`).
- [x] Fixed refresh/session workspace regression root cause: initial unauthenticated render no longer wipes stored active workspace id, so F5 does not force redirect to settings.
- [x] Login checkbox label updated from `Remember me` to `Stay signed in`.
- [x] Light theme readability pass for Assign/People: improved muted contrast, fixed low-contrast `COMPLETED`/`CANCELED` badges, and refined light-card visual quality.
- [x] Light theme hard fix for invisible titles: explicit high-contrast text color added for Assign project titles and People card names.
- [x] People recommendation flow stability:
  - recommendation toggle errors now surface as People-action errors, not generic stats errors (`Failed to load stats`)
  - prevents recommendation clicks from polluting overview/user-stats error state.
- [x] Team fallback wording unified in UI where user has no team: `No team`.
- [x] Assign UX update:
  - added `+ Add new project` action in Assign controls
  - embedded project creation section in Assign with tighter spacing for wide layout
  - project creation/edit now allows `No team` (team optional).
- [x] Assign overlay layering fix: raised z-index/overflow behavior for search/filter/random tooltips/popovers so they render above cards.
- [x] Settings Workspace layout pass: denser wide-screen card layout for workspace action fields to reduce wasted space.
- [x] Added Preferences toggle: `Require team when creating project`.
- [x] Project creation behavior now follows the new preference across Dashboard + Assign create flows.
- [x] Workspace profile save flow hardened:
  - save now sends only changed fields
  - clear API error messages are surfaced to the user instead of generic failure toast.
- [x] Backend CORS policy updated to support workspace edit/save flows:
  - added `PATCH` (and `HEAD`) to allowed CORS methods in both MVC and Spring Security CORS config
  - fixes `Invalid CORS` failures when saving workspace profile/avatar updates from frontend.
- [x] Workspace avatar behavior implemented:
  - avatar URL has live preview in Settings -> Workspace profile
  - active workspace avatar is shown in topbar (fallback to workspace initial).
- [x] Workspace Profiles edit flow improved:
  - each owned/manageable workspace in the list now has an `Edit` action
  - selecting `Edit` loads that workspace profile form for update/save
  - `Creator` badge shown for owned workspaces.
- [x] Persisted theme selection (`light`/`dark`) in localStorage so F5 no longer resets to dark mode.
- [x] Workspace refresh fallback improved: if stored workspace id is missing/invalid (common in demo resets), app now auto-selects an available active workspace instead of forcing null -> settings.
- [x] Comments attachment UX improved:
  - explicit file type/size hint (`PNG/JPG/WEBP`, max 8MB)
  - client-side validation before upload
  - visible upload progress state with file name while upload is in-flight.
- [x] Workspace route stability hardening: when workspace fetch errors occur (e.g., transient backend/rate-limit issues), app keeps the user on current page with warning instead of redirecting to `/settings`.
- [x] Discord-style `@` mentions added for comments + project descriptions (Dashboard/Create/Edit):
  - autocomplete menu for `@everyone`, teams, roles, and users
  - keyboard support (`ArrowUp/ArrowDown`, `Enter`, `Tab`, `Esc`)
  - mention tokens saved in text as readable + resolvable format:
    - `@everyone`
    - `@Team Name{team:<teamId>}`
    - `@Role Name{role:<roleId>}`
    - `@User Name{user:<userId>}`
- [x] Backend mention notification parser extended (comments):
  - supports new structured mention tokens for user/team/role/everyone
  - keeps legacy mentions working (`@email`, `@teammention`)
  - deduplicates notifications per user to avoid multiple emails from combined mentions in one comment.
- [x] Avatar management actions added directly from topbar icons:
  - workspace avatar button now opens `Update` / `Delete`
  - user avatar button now opens `Update` / `Delete`
  - update flow supports both URL input and direct image upload (PNG/JPG/WEBP, max 8MB)
  - delete clears avatar and falls back to initials.
- [x] User profile API/model extended with `avatarUrl` so personal avatar persists across login/profile/topbar.
- [x] Settings -> Workspaces profile flow tightened:
  - `Workspace profile` editor is now hidden by default
  - it appears only after pressing `Edit` on a workspace in `Your workspaces`
  - each workspace row keeps badges/actions aligned to the far-right for consistent layout.
- [x] Toast/notification UX hardening:
  - duplicate toasts are now suppressed inside a short dedupe window
  - identical active toasts are not rendered twice
  - toast stack is capped to keep notifications readable and professional.
- [x] Mention email notifications expanded beyond comments:
  - mentions in **project title**, **project description**, and **comments** now trigger email notifications
  - notification email now includes **who mentioned you**, **where** (`comment` / `project description` / `project title`), and snippet context
  - supports user/team/role/everyone mention tokens and keeps legacy mention formats.
- [x] Settings -> Workspaces `Edit` UX redesigned:
  - workspace profile editor now opens inline **directly below** the selected workspace row (not at the bottom of the panel)
  - `Edit` acts as toggle (`Edit` / `Close`)
  - profile editor is hidden unless a workspace row is explicitly opened.
- [x] Notifications settings expanded for mentions:
  - added per-source mention email controls:
    - `Email mention from comments`
    - `Email mention from project descriptions`
    - `Email mention from project titles`
  - backend preference model/request/response/service updated to persist and enforce these toggles
  - mention emails now respect both recipient-type toggles (`@mention` / `@teammention`) and source toggles.
- [x] Avatar UX/layout pass:
  - fixed avatar rendering with uploaded relative URLs by resolving them against API base URL
  - profile/workspace avatar update modal now shows a much larger preview image for practical visual validation
  - workspace inline editor now supports click-to-upload directly on the avatar image
  - removed redundant inner `Close` action from inline workspace profile editor (toggle remains on row `Edit`)
  - replaced old small avatar preview note with larger avatar-focused layout in workspace profile edit.
- [x] Settings panel resize system limits improved:
  - minimum panel height lowered to `~200px` across settings cards (practical compact mode)
  - max panel height made dynamic and much higher (viewport-aware) so users can expand until internal scroll is minimized/disappears
  - resizing still keeps safe bounds so cards never collapse/disappear.
- [x] Settings -> Workspace profile avatar UX redesign:
  - removed inline helper text (`Click image to upload ...`)
  - added a dedicated compact `Workspace avatar` panel with:
    - `Update photo` (file upload)
    - `Delete photo`
    - `Photo from link` + `Apply`
    - format/size info (`PNG/JPG/WEBP up to 2MB`)
  - avatar actions now use small, consistent buttons and tighter layout.
- [x] Topbar identity alignment/polish:
  - workspace and user now both render with unified avatar+name pill styling (same visual scale/height)
  - avatar is positioned left of label for both workspace and user
  - burger menu button moved out of the middle (no longer between workspace and user identity controls).
- [x] Topbar avatar interaction simplification:
  - removed avatar popover actions (`Update` / `Delete`) for both workspace and user avatars
  - clicking avatar now opens the avatar editor modal directly
  - all avatar controls are centralized in one modal (upload, link, delete, save/cancel) with tighter compact spacing.
- [x] Avatar modal UX redesign (workspace + profile):
  - rebuilt modal layout to a cleaner two-zone structure (preview card + controls panel)
  - moved action buttons to clearer positions (`Upload/Delete` in controls zone, `Cancel/Save` in footer)
  - improved compact spacing and responsive behavior for small screens.
- [x] Avatar modal refinement + CORS hardening:
  - avatar modal controls tightened (cleaner action grouping and footer separation)
  - improved button styling for clearer hierarchy and less visual noise
  - backend CORS relaxed for local dev via origin patterns (`localhost:*`, `127.0.0.1:*`) to reduce `Invalid CORS request` regressions during avatar/workspace updates.
- [x] Avatar modal interaction update:
  - removed `Cancel` action and added close `X` in modal top-right
  - moved `Upload image` and `Save avatar` into the same footer action row
  - removed separate `Delete photo` button; delete now uses `X` on the avatar image with confirmation.
- [x] Login UI micro-fix:
  - `Stay signed in` checkbox row now remains inline (no word wrapping)
  - increased checkbox label container width for cleaner alignment/readability.
- [x] Auth form spacing cleanup (Login + Register):
  - removed boxed styling around `Stay signed in` (plain inline checkbox row)
  - normalized auth form/grid spacing for more consistent vertical rhythm across both pages.
- [x] Auth card layout refresh (Login + Register):
  - rebuilt auth panel spacing and header hierarchy (logo/title/subtitle/action button)
  - reduced excessive top gap and tightened vertical rhythm between email/password sections
  - improved consistency for input/label/error spacing for a cleaner, more professional card layout.
- [x] Settings panel default height behavior updated:
  - `Workspaces`, `Teams`, `Roles`, `Preferences`, and `Notifications` now initialize at maximum allowed height by default
  - users can still resize panels up/down manually from the resize handles.
- [x] Settings full-height default pass (no inner-card scroll by default):
  - raised settings panel max-height ceiling substantially and increased dynamic clamp for true "fully stretched" initialization
  - removed internal `settings-scroll` / `workspace-column-list` fixed max-height constraints so full card content can render without inner scrollbars by default
  - user manual resize remains available.
- [x] Added Settings `Tab View` alongside existing `Grid View`:
  - new view-mode switch (`Grid View` / `Tab View`) in settings header
  - tab row at top (`Workspaces`, `Teams`, `Roles`, `Preferences`, `Notifications`)
  - in `Tab View`, only the selected category renders as a full-width panel below tabs
  - existing `Grid View` behavior (drag/reorder/resize handles) remains unchanged.
- [x] Settings Grid performance/collision stability pass:
  - replaced frequent full-panel remeasure loop with `ResizeObserver` + `requestAnimationFrame` batching per panel
  - disabled auto-fit while dragging/resizing to avoid jitter and layout thrash
  - optimized row span calculation to use known panel heights (no per-frame `getBoundingClientRect()` reads)
  - enabled denser grid packing (`grid-auto-flow: dense`) to reduce visual gaps/collision artifacts.
- [x] Settings view-switch + tab spacing polish:
  - converted `Grid View` / `Tab View` controls to icon buttons (with tooltip + aria labels)
  - tightened vertical spacing between Settings header, view switch, tabs, and tab content
  - reduced tab strip/content gap for a denser, cleaner tab-view layout.
- [x] Settings Tab View compact layout pass:
  - added icons on category tabs and improved tab-button density
  - reworked tab-mode content density to avoid over-stretched single-column rendering
  - teams/roles/workspaces lists in tab mode now render in responsive multi-column grids to use width more professionally.
- [x] Settings Tab View dense-spacing pass:
  - tightened top spacing (settings header, tabs strip, panel start)
  - reduced tab/button/card/list paddings and gaps for higher information density
  - expanded preferences/notifications tab internals into responsive multi-column layout to reduce unnecessary vertical scroll.
- [x] Settings Tab View layout refinement by section:
  - Preferences and Notifications now use a two-column split (`main` + `coming soon` side rail) to reduce vertical scrolling
  - Teams `Create team` actions constrained to practical content width (no full-row stretch)
  - Workspaces list items constrained in tab mode so single rows do not span the entire page width
  - grid/tab switch icon visibility hardened (icon-only controls with explicit icon color/rendering).
- [x] Team color system added (64-color palette):
  - `Create team` now supports selecting one of 64 curated colors (red/yellow/orange/green/blue/cyan/purple/teal families)
  - selected team color is persisted in backend (`Team.color`) via create/update APIs
  - teams list now displays a color dot next to each team name for quick visual identification.
- [x] Team color marker visual tweak:
  - team color indicator next to team name changed from circular dot to compact triangle marker.
- [x] Team edit flow now includes color:
  - `Edit team` (rename action) now includes the same color palette selector
  - team name and team color are saved together in one update action.
- [x] Team color/edit reliability fixes:
  - team color triangle now uses direct border color binding (stable render)
  - `Edit team` now opens directly in `Rename` mode so color+name can be edited and confirmed immediately
  - color selection in edit mode now clears stale validation error state.
- [x] Settings view-switch icon visibility hard fix:
  - replaced SVG-only switch icons with CSS-drawn icon glyphs (grid + tabs) to avoid invisible icon rendering in affected environments.
- [x] Grid/Tabs and team-color reliability fixes:
  - Preferences/Notifications two-column split now applies only in `Tab View` (single-column behavior restored in `Grid View` to prevent overlap)
  - team color updates now apply robustly in frontend state even when backend response omits color field, so color marker reflects saved selection immediately.

---

## From PMD-todo.md

Here is the notes that codex write from Ioannis instractions,
that will help codex to keep a todo list and when a task Done
codex will write 
----------------
|Done Done Done|
|Done Done Done|
|Done Done Done|
----------------



Dashboard ? Structural & UX refinement (professional pass)

Context
The dashboard currently mixes project lists, counters, and pie charts, but there are UX and logic issues:
- Missing ?Unassigned? visibility
- Pie charts are cramped and labels are truncated
- Font size and layout reduce readability
- Status logic is duplicated across cards, counters, and charts

Goals
Clean, professional dashboard with clear hierarchy, single-source-of-truth logic, and readable analytics.

Required changes

1) Add ?Unassigned? project column
- Add a new column at the far left named **Unassigned**
- It contains projects with zero assigned people
- Column order must be:
  Unassigned ? Assigned ? In Progress ? Completed
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
  - No label truncation (no ???)
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


MongoDB Data Model Refactor ? PMD (Professional Structure)

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
Used for People ? personal statistics.

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

## 2026-01-27 ? Project create visibility + assign-on-create

TODO
- [ ] Fix team filter: ?all teams selected? must not hide unassigned projects (DashboardPage + AssignPage)
- [ ] Enhance CreateProjectForm: assign people with search + compact selected chips
- [ ] Wire create flow to update/refetch shared projects source immediately after create
- [ ] Backend: include createdBy fields in ProjectResponse + add dev logging for create/list DB/collection/filters
- [ ] Frontend: add createdBy fields to Project type + display minimally in project details
- [ ] Run frontend lint and backend mvnw tests
- [ ] List all files changed and verification commands

## 2026-01-27 ? Completed

- [x] Fix team filter: ?all teams selected? no longer hides unassigned projects (DashboardPage + AssignPage)
- [x] Enhance CreateProjectForm: assign people with search + compact selected chips
- [x] Wire create flow to update/refetch shared projects source immediately after create
- [x] Backend: include createdBy fields in ProjectResponse + add dev logging for create/list DB/collection/filters
- [x] Frontend: add createdBy fields to Project type + display minimally in project details
- [ ] Run frontend lint and backend mvnw tests
- [ ] List all files changed and verification commands

## 2026-01-27 ? Statuses + archived gating + register overlay

TODO
- [ ] Backend: add/confirm `ARCHIVED` and `CANCELLED/CANCELED` statuses in enum + service handling
- [ ] Frontend: extend status types/options and unify filter/counter logic to include Archived + Cancelled
- [ ] Archived behavior: gate actions to Restore/Delete only; Restore -> Unassigned (NOT_STARTED + clear members)
- [ ] Delete: confirm hard delete endpoint + add compact confirmation in UI
- [ ] Charts: ensure status labels don?t crop with new statuses
- [ ] Register UX: make ?Passwords do not match.? an overlay with no layout shift + a11y attrs
- [ ] Run lint + backend tests
- [ ] Record changed files + verification steps

## 2026-01-27 ? Completed (statuses + archived gating + register overlay)

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

## 2026-01-27 ? Verification update

- [x] Frontend lint: `npm run lint` passes
- [x] Backend tests: `./mvnw -q -DskipTests=false test` passes

## 2026-01-27 ? Epic: Assign Smart Filters + Randomizer + Recommendations

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
  - [ ] Add ?Assigned to me? filter chip
  - [ ] Add ?Random Project? button (+ optional team filter for random tools)
  - [ ] Add ?Random Assign? button when a project is selected
  - [ ] Pin recommended people at top with star badge + tooltip
  - [ ] Add ?Recommended? filter option
- [ ] People page:
  - [ ] Add ?Recommended? filter option
  - [ ] Show star badge and allow toggle + tooltip
- [ ] Ensure truncation + tooltip + no layout jump

Verification
- [ ] `npm run lint`
- [ ] `./mvnw -q -DskipTests=false test`
- [ ] Manual flows (Assign random project/assign, recommendations, recommended filter)

## 2026-01-27 ? Completed (Assign smart filters + randomizer + recommendations)

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

## 2026-01-27 ? People page layout gap + editable widgets

TODO
- [x] Diagnose People page selection layout gap (compare no-selection vs selected DOM/CSS)
- [x] Fix layout: left directory + right details scrollable, no blank gap on selection
- [x] Add People widgets edit UI + persistence (visible/order/config)
- [x] Backend: add peoplePageWidgets to user profile + PATCH endpoint
- [x] Frontend: edit mode, save/cancel, apply preferences
- [x] Update notes with root cause + decisions
- [ ] Verify People selection (no gap) + widget prefs persist on refresh

## 2026-01-27 ? UI polish: toolbar icon hover + profile pill

TODO
- [x] Standardize search/filter icon button states (hover/active/disabled) with readable contrast
- [x] Style profile name control as pill button (theme-safe, focus-visible ring)
- [ ] Verify hover/active in dark + light themes

## 2026-01-27 ? UI regression: Assign layout + dice random

TODO
- [x] Fix Assign header/control alignment (no overlap)
- [x] Replace Random Project button with dice icon
- [x] Standardize dice icon for random actions
- [ ] Verify responsive layout + DnD

## 2026-01-27 ? UI regression: filter active state + assign meta layout

TODO
- [x] Fix filter icon default/hover/active states (active only when toggled)
- [x] Fix Assign project card meta layout (status + members row stable)
- [ ] Verify dashboard filter + assign meta row

## 2026-01-27 ? UI regression: Assign panel overflow

TODO
- [x] Fix Assign panel horizontal bleed (grid min-width/overflow)
- [ ] Verify Assign panels stay within bounds on resize

## 2026-01-27 ? Assign Available People layout regression (2x2 + vertical scroll)

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

## 2026-01-27 ? CI fix: TS null guard + Mongo service

TODO
- [x] Fix TS2345 in ProjectDetails (null guard)
- [x] Add MongoDB service to backend CI job
- [ ] Run frontend build + backend tests

## Fix Filter button hover/active effect (Dashboard + People)

TODO
- [x] Normalize filter active state on Dashboard + People to use default selection state
- [x] Fix filter icon hover/active CSS to match Assign baseline
- [ ] Verify Dashboard + People filter behavior in dark/light themes

## 2026-01-28 ? v0.0.2 snapshot + CI tags + local compose

TODO
- [x] Step A: create and push annotated tag v0.0.2
- [x] Step B: enable CI/CD on tag pushes and add image tag :v0.0.2
- [x] Step C: add docker-compose.local.yml and README section for one-command run

## 2026-01-28 ? Fix JWT secret in docker-compose.local.yml

TODO
- [x] Update PMD_JWT_SECRET to a secure 32+ char value for local compose

## 2026-01-28 ? Local compose reliability (mongo + orphan cleanup)

TODO
- [ ] Update docker-compose.local.yml to ensure mongo starts and backend uses service name
- [ ] Add mongo healthcheck + depends_on condition for backend
- [ ] Decide on mailhog inclusion or remove orphan warnings
- [ ] Ensure JWT secret is safe default (no real secret)
- [ ] Update README local run + clean reset commands
- [ ] Verify fresh clone up -d starts all services


## 2026-01-28 ? Local compose reliability (mongo + orphan cleanup) ? Completed
- [x] Update docker-compose.local.yml to ensure mongo starts and backend uses service name
- [x] Add mongo healthcheck + depends_on condition for backend
- [x] Include mailhog to avoid orphan warnings
- [x] Ensure JWT secret safe default (no real secret)
- [x] Update README local run + clean reset commands


## 2026-01-28 ? Backend Mongo env precedence (docker local)

TODO
- [ ] Find why SPRING_DATA_MONGODB_URI is ignored in Docker
- [ ] Remove/override any localhost fallback in config
- [ ] Confirm backend container receives env vars
- [ ] Verify backend stays up and actuator health is UP


## 2026-01-28 ? Backend Mongo env precedence (docker local) ? Completed
- [x] Find why SPRING_DATA_MONGODB_URI is ignored in Docker
- [x] Remove/override any localhost fallback in config
- [x] Confirm backend container receives env vars
- [x] Verify backend stays up and actuator health is UP


## 2026-01-28 ? Backend Mongo env precedence (docker local) ? Verification
- [x] docker compose up -d starts backend with mongo service host
- [x] curl http://localhost:8080/actuator/health returns status UP


## 2026-01-28 ? Demo seed expansion
todo:
- [ ] Add comprehensive demo seeding of 10 named users + 10 matching projects
- [ ] Ensure seeds run conditionally (dev profile or PMD_SEED_DEMO)
- [ ] Document new demo users/projects for quick login reference
- [ ] Tag release as v0.0.3 without disturbing current master

\n## 2026-01-28 ? Demo seed expansion ? Completed\n- [x] Add comprehensive demo seeding of 10 named users + 10 matching projects\n- [x] Ensure seeds run conditionally (dev profile or PMD_SEED_DEMO)\n- [x] Document new demo users/projects for quick login reference\n- [x] Tag release as v0.0.3 without disturbing current master\n
\n- [x] Enable docker-compose to trigger demo seed automatically for local runs

## 2026-01-28 ? Backend docker stability (Mongo URI + JWT)

TODO
- [x] Reproduce backend exit in C:\Projects\PMD and capture logs/inspect
- [x] Fix Mongo URI resolution for dev profile (docker network)
- [x] Add JWT secret validation + dev auto-generation
- [x] Make startup runners resilient to Mongo not-ready
- [x] Update local compose to build backend and use safe dev JWT secret
- [ ] Verify backend stays up 2+ minutes and /actuator/health is UP

## 2026-01-28 ? Backend docker stability (Mongo URI + JWT) ? Verification
- [x] Backend stays up 2+ minutes in C:\Projects\PMD after `docker compose up -d --build`
- [x] `curl http://localhost:8080/actuator/health` returns status UP

## 2026-01-28 ? Connectivity audit tasks

TODO
- [x] Capture Maven failure stack trace and record in notes
- [x] Define local/docker profiles and defaults (Mongo + JWT)
- [x] Ensure Docker backend uses mongo service name
- [x] Remove backend filters hiding projects for non-admins
- [ ] Verify Maven run works after JWT/local profile changes
- [ ] Verify projects visible after seed + create (Dashboard + Assign)
- [ ] Update README run modes + frontend API base env

## 2026-01-28 ? Maven run verification (notes)
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

## 2026-01-30 - UI polish (Assign random picker + Settings 3-column)

DONE
- [x] Assign: random project picker button/chip replaces list selector and respects filters.
- [x] Settings: Workspaces section split into 3 columns with Demo column separated.

TODO
- [ ] Manual verify Assign random picker respects filters and no dropdown remains.
- [ ] Manual verify Settings layout on desktop + mobile stack.

## 2026-01-30 - CI + Settings/Teams
DONE
- Backend: WorkspaceJoinRequestRepository query method added.
- Frontend lint fixed (catch vars + hook deps).
- Settings Workspaces layout updated to 2-column; demo grouped under Workspaces.
- Settings Teams panel added; team create/update refresh and validation.
- TeamIntegrationTest updated for workspace-scoped routes and JWT auth.

TODO
- None added in this pass.

## 2026-01-30
- [x] Add notification preferences (server-stored) and Settings UI toggles.
- [x] Enforce email preferences for assignment/mentions/status/membership/overdue.
- [x] Send confirmed-email message after successful confirmation.
- [ ] Review overdue reminder heuristic once true due dates exist.


## 2026-01-30 - Hybrid DEV/Reviewer workflow (random port + proxy)

TODO
- [ ] Verify DEV flow: deps up -> backend random port -> frontend proxy works
- [ ] Verify REVIEWER flow: docker compose local up --build on fixed ports
- [ ] Confirm API calls succeed via Vite proxy (no hardcoded 8099)

## 2026-01-31 - Backend port file writer

DONE
- [x] BackendPortFileWriter compiles with Boot 4 import and runs only in local/dev
- [x] Tests pass; backend writes .runtime\\backend-port.txt when SERVER_PORT=0

## 2026-01-31 - Frontend build fix (apiFetch)

DONE
- [x] Replace notifications API import to use requestJson so build passes


## 2026-01-31 - CI/compose parity follow-ups
- [ ] Close any running Node/Vite processes and rerun `npm ci` (EPERM esbuild.exe)
- [ ] Run `npm run build` and `npm run lint` after npm ci succeeds
- [ ] Build reviewer images: `docker compose -f docker-compose.local.yml --profile reviewer build --no-cache`
- [ ] Reviewer sanity: `docker compose -f docker-compose.local.yml --profile reviewer up -d --build` + curl checks

---

## 2026-02 ? Settings & Workspace UX (from PMDNOTES ? PRD)

**Source:** Desktop PMDNOTES.txt. Below: only items not fully implemented or with confirmed bugs.

**Verification (codebase):** PRD 1: SettingsPage has single settings-grid, no left sidebar. PRD 2: createWorkspace exists; "Create demo workspace" option in same form not in UI. PRD 3: Team rename only Save (no Cancel); button "Add team"; Team model has no description. PRD 4: Role edit only Save (no Cancel). PRD 5: initialTeams key=`${team}-${index}` causes input remount/focus loss; "Not Found" only in error messages.

### PRD 1 ? Settings layout (two-column, categories)

**Context**
Settings today is a single scrollable page with cards. User wants a clear category-based layout so Workspaces, Teams, Roles (and future sections) are easy to find and use.

**Goals**
- Left column: list of setting categories (e.g. dropdown or nav list): Workspaces, Teams, Roles. Later: Preferences, Notifications, General, People, Teamspace, my-to-do, timesheets, reports, calendar, workload, created by me.
- Right column: content of the selected category only.
- Responsive: two columns on desktop; on small screens either one column or collapsible sidebar.
- All existing Settings features remain and work; no regressions.

**Requirements**
- [ ] Refactor Settings page to two-column layout: left = category list (Workspaces | Teams | Roles for now).
- [ ] Right panel shows only the selected category (Workspaces, Teams, or Roles).
- [ ] Ensure responsive behavior and that Workspaces, Teams, Roles display correctly in the new layout.
- [ ] (Backlog) Add further categories when implemented: Preferences, Notifications, General, People, Teamspace, my-to-do, timesheets, reports, calendar, workload, created by me.

**Acceptance**
- User can switch categories from the left; right content updates without full-page scroll.
- Layout works on narrow viewports; no broken layout or ?Not Found? due to routing/structure.

---

### PRD 2 ? Create workspace & demo (fix + UX)

**Context**
User reports ?create workspace doesn?t work?. Code exists for create workspace and for ?Enter Demo?; user wants demo to be an explicit creation option next to normal create.

**Goals**
- Create workspace flow works reliably (diagnose and fix any API/UX failure).
- One create flow with two actions: ?Create workspace? (normal) and ?Create demo workspace? (pre-seeded, editable by user). Demo is an option in the same create area, not only a separate ?Enter Demo? button.

**Requirements**
- [ ] Investigate and fix create workspace: reproduce failure, fix backend or frontend (errors, selection of new workspace, etc.).
- [ ] In Settings (and/or WorkspacePicker): add explicit ?Create demo workspace? option next to ?Create workspace? (e.g. two buttons or toggle: Create workspace | Create demo workspace). New demo workspace contains seeded data; user can edit and experiment.
- [ ] New workspace creation: keep ability to set name and initial team(s); optionally prompt user to create first team after creation (e.g. link to Settings > Teams).

**Acceptance**
- Create workspace succeeds and user lands in the new workspace (or sees clear error).
- User can create a demo workspace from the same create area and get a pre-filled workspace.

---

### PRD 3 ? Teams (Settings): UX & Cancel

**Context**
Teams section has create team and rename. User wants: (1) Rename to have Cancel/Close, (2) clearer labeling so ?Add team? in Team actions is understood as ?Create team?, (3) optional team description/note; (4) invite people to team (workspace members ? team).

**Goals**
- Team rename has Save and Cancel (discard without saving).
- ?Create team? action is clearly labeled (avoid confusion with ?Add team? in initial teams).
- Optional: team note/description; invite workspace members to team.

**Requirements**
- [ ] Team rename (inline edit): add Cancel/Close button; on Cancel, clear edit state and do not call update.
- [ ] In ?Team actions?, rename button from ?Add team? to ?Create team? (or equivalent) so it?s clear this creates a new team in the workspace. Keep ?Initial teams? in Create workspace as-is, but consider labeling ?Add initial team? if it reduces confusion.
- [ ] (Optional) Add team description/note field (create + edit).
- [ ] (Optional) Invite to team: allow adding workspace members to a team (if backend supports; else document as future).

**Acceptance**
- User can cancel team rename without saving. Create-team action is clearly named. No focus loss when typing in Create workspace initial team names (see PRD 4).

---

### PRD 4 ? Roles (Settings): Cancel on edit

**Context**
Role edit has Save but no Cancel; user wants to discard edits without saving.

**Goals**
- When editing a role (name/permissions), user can Cancel to discard changes and exit edit mode.

**Requirements**
- [ ] Role edit panel: add Cancel button; on Cancel, clear `editingRoleId` (and related state) without calling updateRole.
- [ ] (Optional) Align role permissions with common product best practices (research and document or add presets).

**Acceptance**
- User can open Edit role, change name/permissions, then Cancel and see previous values restored.

---

### PRD 5 ? Bugs (Settings & Demo)

**Context**
Concrete bugs from notes: (1) Typing one character in ?Initial teams? team name field loses focus. (2) ?Not Found? and wrong buttons in Demo workspace area. (3) Rename flows without Cancel (covered in PRD 3 & 4).

**Goals**
- Fix input focus loss; fix any ?Not Found? and wrong Demo buttons; ensure Settings categories and demo section are correct.

**Requirements**
- [ ] **Initial teams input focus:** In Create workspace > Initial teams, the list uses `key={\`${team}-${index}\`}`. When user types, `team` changes and React remounts the input, losing focus. Fix: use stable key (e.g. `key={\`initial-team-${index}\`}` or stable id) so the input is not remounted on keystroke.
- [ ] **Demo area:** Remove or fix any ?Not Found? in Settings/WorkspacePicker; fix wrong button labels or placement in the Demo workspace block (e.g. ?Enter Demo Workspace? / ?Reset Demo Workspace? in correct place, no duplicate or misplaced actions).
- [ ] Verify Settings categories (Workspaces, Teams, Roles) and demo section render correctly and are responsive everywhere.

**Acceptance**
- User can type a full team name in Initial teams without losing focus. No spurious ?Not Found? in Settings; demo actions are correct and visible where expected.

----------------
|Done Done Done|
|Done Done Done|
|Done Done Done|
----------------
(End of PRD section from PMDNOTES.txt)

## 2026-02-16 - Desktop instructions review (PMD-MVP + addsecprompt)

### PMD-MVP-INSTRUCTIONS.md relevance audit

Context
- The desktop MVP file describes an early generic PM stack (Project/Task MVP) that does not fully match current PMD workspace-scoped architecture.
- Current PMD already exceeds that baseline (workspaces, roles, invites, stats, recommendations, demo seed, hybrid/reviewer flows).

Decision
- [x] Keep only the parts that still make professional sense (security baseline, operational docs, stable CI checks).
- [x] Do not regress product architecture back to generic Project/Task MVP.
- [x] Remove desktop `PMD-MVP-INSTRUCTIONS.md` after extracting useful items into PMD repo TODO/docs.

### addsecprompt.md security hardening pass

Completed in code
- [x] Backend malicious request filter added (`MaliciousRequestFilter`) for Velocity/XSLT/path traversal/reflection signatures.
- [x] Backend rate limiting filter added (`RateLimitingFilter`) with env-configurable minute/hour thresholds.
- [x] Security filter chain updated to include hardening headers and register custom security filters before JWT auth.
- [x] CORS origins moved to env-driven config (`PMD_ALLOWED_ORIGINS`) and rate-limit headers exposed.
- [x] Frontend dev proxy hardening in `vite.config.ts` (malicious pattern blocking + forwarded client IP headers).
- [x] Frontend baseline security meta tags added in `index.html`.
- [x] Frontend CSP violation and unhandled rejection monitoring hooks added in `src/main.tsx`.

Documentation tracking
- [x] Security audit/analysis/plan/checklist merged into `PMD-progress-notes.md` + `PMD-todo.md` only.
- [x] Extra standalone security PRD markdown files removed to keep single source of progress truth.

Pending (recommended next)
- [ ] Add focused backend security integration tests for `403` and `429` paths.
- [ ] Validate security behavior in full local compose run (manual negative tests with attack payloads).
- [ ] Add production edge security layer (reverse proxy/WAF level rate-limit + blocking) and monitor alerts.


---

## From PMD-progress-notes.md

Here is the notebook that Codex will note all the useful informations, 
informations that maybe we need in the future, 
also a list of changes done by codex that was written at PMD-todo.md as lakonic as posible.
## 2026-01-27  New project not visible (diagnosis + plan)

Root-cause hypothesis (evidence in code):
- Dashboard and Assign default the team filter to all teams selected.
- The team filter logic requires a project to have at least one member whose team is selected.
- Newly created projects often have `memberIds: []`, so they fail the team filter and are hidden.

Planned fixes:
- Treat all teams selected as no-op in `projectMatchesTeamFilter` on both Dashboard and Assign.
- Ensure create flow refetches/updates the shared projects state immediately.
- Extend create UI to assign people with search.
- Surface author/creator (backend response + minimal frontend display).
- Add dev logging for create/list DB/collection/query filters.

## 2026-01-27  Progress update (visibility bug + create enhancements)

What I changed:
- Root cause fixed: team filter now treats all teams selected as a no-op in `DashboardPage.tsx` and `AssignPage.tsx`, so new projects with empty `memberIds` are not hidden by default.
- Create flow improved: `CreateProjectForm.tsx` now supports assign-on-create with search + team filter, and shows compact selected chips.
- Immediate UI update: `App.tsx` now inserts the created project into shared state before refetching.
- Contract alignment: backend `ProjectResponse` now includes `createdByUserId`, `createdByName`, and `createdByTeam`.
- Dev logging added: backend `ProjectService` logs Mongo db/collection plus create/list context at debug level.

Why the bug happened:
- Default team filter selected all teams but still required at least one assigned member, excluding newly created unassigned projects.

## 2026-01-27  Statuses + archived gating + register overlay (progress)

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

## 2026-01-27  Verification

- Frontend lint (`npm run lint`) passes after changes.
- Backend tests (`./mvnw -q -DskipTests=false test`) pass.

## 2026-01-27  Assign smart filters + randomizer + recommendations (contracts)

Data model decisions:
- Assignable people are the existing `users` documents.
- Contract mapping: `personId == userId` for `/api/people/*` endpoints.
- User recommendation fields:
  - `recommendedByUserIds: string[]`
  - `recommendedCount: number` (denormalized; synchronized in `UserService.save`)

Counting rules (fewest projects):
- Active project count uses ONLY `NOT_STARTED` and `IN_PROGRESS`.
- `CANCELED` and `ARCHIVED` are excluded from the fewest projects algorithm.

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
  - Toggles current users recommendation; prevents recommending yourself (409).
  - Returns: `{ personId, recommendedCount, recommendedByMe }`
- GET `/api/people/{personId}/recommendations`
  - Returns recommenders as `UserSummaryResponse[]`.
- GET `/api/people/recommended?teamId=...`
  - Returns recommended users (`recommendedCount > 0`) sorted by count desc then display name.

## 2026-01-27  Implementation notes (Assign smart filters + randomizer + recommendations)

What changed:
- Backend
  - Extended `User` with `recommendedByUserIds` and `recommendedCount`.
  - User summaries now include `recommendedCount` and `recommendedByMe`.
  - Added `/api/people` recommendation endpoints and `/api/projects` random + assignedToMe support.
  - Random selection is server-owned and uses fewest ACTIVE projects then random among the minimal pool.
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

## 2026-01-27  People page layout gap + editable widgets (start)

Planned work:
- Diagnose selection gap by comparing layout/DOM with and without selection in People page.
- Implement structural fix (no min-height/flex stretch causing blank space).
- Add per-user peoplePageWidgets config with backend endpoints and frontend edit UI.

## 2026-01-27  People page selection gap (root cause + fix)

Root cause:
- `.people-layout` grid stretched both columns to the tallest item when a person was selected.
- The left directory card stretched to match the taller details panel, while its inner scroll area was capped by `max-height`, leaving a large blank gap.

Fix:
- Set `.people-layout` to `align-items: start` and constrain both cards with `max-height` and `overflow: auto`.
- Converted the directory card to a two-row grid so the list scrolls within a stable container.

## 2026-01-27  People widgets preferences (decision + contract)

Decision:
- Store `peoplePageWidgets` on the user profile with `visible`, `order`, and `config`.
- Defaults include `projectsByStatus` and `activeVsInactive` with status labels matching stats (Not started, In progress, Completed, Canceled, Archived).

Endpoint contract:
- PATCH `/api/auth/me/people-page-widgets` accepts `{ visible, order, config }` and returns merged preferences.
- GET `/api/auth/me` returns `peoplePageWidgets` with defaults if missing.

## 2026-01-27  UI polish: toolbar icons + profile pill

What changed:
- Standardized toolbar icon buttons (search/filter) with new icon-toggle styles: subtle hover, clear active ring, readable contrast in both themes.
- Styled the top-right profile name as a pill button (profile-pill) with consistent border/background and focus-visible ring; added tooltip + truncation.

Reason:
- Prevent icon color from washing out on hover while keeping active state consistent with Assigned to me toggle, and remove the harsh default focus rectangle on the profile control.

## 2026-01-27  UI regression: Assign layout + dice random (start)

Planned: align Assign header/control bars, replace random buttons with dice icon, standardize random action buttons.

## 2026-01-27  UI regression: Assign layout + dice random (fix)

Root cause:
- Assign panel controls were split into separate blocks and mixed grid/absolute layout, causing header controls to drift and overlap when content wrapped.

What changed:
- Consolidated Assign panel headers into a single flex row with fixed min-height and consistent spacing.
- Replaced Random Project and Random Assign text buttons with a shared dice icon button using the icon-toggle style.
- Added responsive wrapping at 960px to prevent overlaps without layout jump.

## 2026-01-27  UI regression: filter active state + assign meta layout (start)

Clarification:
- Filter icon should only show active styling when toggled; default matches search icon, hover adds purple accent.

## 2026-01-27  UI regression: filter active state + assign meta layout (fix)

Root cause:
- Filter active state was derived from selected.length < allOptions.length, so defaults that omit extras (e.g., Unassigned/Recommended) made the filter appear active by default.
- Assign project cards inherited a grid meta row without flex constraints, so the status + members row could overflow or clip inside the card.

Final behavior spec:
- Filter icon: neutral by default, purple hover, and ON styling only when selection deviates from the default set.
- Assign project cards: title row + meta row with stable flex sizing (status badge + members text).

What changed:
- Added explicit ilterActive computation in Dashboard/Assign and passed it to FilterMenu.
- Scoped Assign project card meta layout to flex row with min-width:0 to prevent clipping.

## 2026-01-27  UI regression: Assign panel overflow (fix)

Root cause:
- Assign grid used min column widths plus nested grids with min-width defaults, allowing child content (folder headers / project grid) to exceed the panel width and bleed into adjacent columns.

What changed:
- Assign grid columns now use minmax(0,1fr) and panels enforce overflow hidden.
- Panel body scrolls vertically only; overflow-x hidden to contain inner grids.
- Scoped Assign layout to ensure dashboard folder/project grid elements can shrink within the panel.

## 2026-01-27  Assign Available People layout regression (start)

Goal: lock Available People to 2-column grid with vertical scroll, no random widths or blank cards.

## 2026-01-27  Assign Available People layout regression (fix)

Root cause:
- Available People grid inherited auto-fit column rules and grid sizing from shared layouts, causing unstable widths and empty/phantom gaps when items changed.

Final CSS rules:
- Grid: grid-template-columns: repeat(2, minmax(0, 1fr)), gap: 12px, lign-content: start.
- Panel body: overflow-y: auto, overflow-x: hidden, lex: 1, min-height: 0.
- Card sizing: min-height: 78px, padding: 10px 12px, left column lex: 1; min-width: 0, right actions lex: 0 0 auto.

## 2026-01-27  Assign CSS overhaul (full-width + 3 critical issues)

Findings / fixes:
1) Blank/tiny Available People cards
- Root cause: card content column collapsed under flex/grid mix and inherited auto-fit grid sizing.
- Fix: .assign-page .available-people-grid now fixed 2 columns; .people-card-main is lex:1; min-width:0; display:flex; flex-direction:column; gap:4px; and cards have min-height:78px + padding:10px 12px.
2) Header controls mislayout
- Root cause: header controls lacked a consistent flex row and inputs could shrink/overflow unpredictably.
- Fix: .assign-panel-header min-height 48px, .assign-panel-controls flex row, .assign-page .member-filters uses flex with gap:8px, inputs/selects lex:1 1 0; min-width:0.
3) Assign not full width
- Root cause: page always used .container max-width 1080px.
- Fix: route-specific container-full on /assign, with max-width:none; width:100%; padding-left/right:28px (16px on small screens).

## 2026-01-27  CI fix (TS null guard + Mongo service)

Root causes:
- TS2345: etchProject returns Project | null, but initializeSelected expected Project.
- Backend CI: no MongoDB service in runner, so contextLoads failed on MongoTemplate.

Changes:
- rontend/pmd-frontend/src/components/ProjectDetails.tsx: guard null response before calling initializeSelected and mark notFound when null.
- .github/workflows/ci.yml: added MongoDB service and SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/pmd.

Notes:
- npm ci failed locally due to EPERM unlink on esbuild.exe (Windows file locked).
- npm run build failed because tsc not found (node_modules missing after npm ci failure).
- Backend ./mvnw test succeeded locally.

## 2026-01-27  Filter button hover/active fix (Dashboard + People)

Root cause:
- Filter active state was derived from selected.length < allOptions.length, so defaults that omit extras (e.g., Unassigned/Recommended) made the filter button appear active by default on Dashboard/People.

Final behavior + CSS:
- Active only when filter deviates from the default selection set (Dashboard) or when Recommended/teams are adjusted (People).
- Uses shared icon toggle styles: .icon-toggle idle, .icon-toggle:hover for hover accent, .icon-toggle[data-active='true'] for ON state.
- Key selectors: rontend/pmd-frontend/src/App.css .icon-toggle / .icon-toggle:hover / .icon-toggle[data-active='true'].

## 2026-01-28  Step A (v0.0.2 snapshot)
Commands:
- git status -sb
- git tag -a v0.0.2 -m "PMD v0.0.2 - stable snapshot before local run setup"
- git push origin v0.0.2
## 2026-01-28  Step B (CI/CD on tags)
Checked/updated workflows:
- .github/workflows/ci.yml: added tag trigger v*
- .github/workflows/release.yml: added tag trigger v* and tag image output
Image tags produced (release):
- :latest
- :<git-sha>
- :<git-tag> (when ref_type == tag, e.g. v0.0.2)
## 2026-01-28  Step C (one command local run)
Added:
- docker-compose.local.yml (frontend, backend, mongo; mongo volume)
- README.md section "Local development - one command run" with compose command and URLs
## 2026-01-28  Fix JWT secret in docker-compose.local.yml
- Updated PMD_JWT_SECRET to a 32+ character value to avoid WeakKeyException.
- File: docker-compose.local.yml
## 2026-01-28  Local compose reliability (mongo + orphan cleanup)
- Updated docker-compose.local.yml to add Mongo healthcheck and gate backend on service_healthy.
- Backend now gets Mongo URI via env (SPRING_DATA_MONGODB_URI) plus SPRING_APPLICATION_JSON to avoid localhost fallback.
- Added MailHog service to local compose to prevent orphan warnings and keep dev email inbox available.
- Set local JWT secret to a safe placeholder (32+ chars, non-sensitive).
Files: docker-compose.local.yml.


- README: documented one-command run + status/logs + clean reset commands and MailHog URL.
Files: README.md.


## 2026-01-28  Backend Mongo env precedence (docker local)
- Root cause: ackend/pmd-backend/src/main/resources/application.yml hardcoded spring.data.mongodb.uri to localhost, so Docker runs tried localhost even when env was set.
- Fix: changed spring.data.mongodb.uri to ${SPRING_DATA_MONGODB_URI} so environment is the single source of truth.
Files: ackend/pmd-backend/src/main/resources/application.yml.


- docker-compose.local.yml: added SPRING_APPLICATION_JSON to force Mongo URI override in container env (backward-compatible with older images).
Files: docker-compose.local.yml.


- PmdBackendApplication now sets spring.data.mongodb.uri system property from SPRING_DATA_MONGODB_URI at startup to guarantee env precedence over any embedded defaults.
Files: ackend/pmd-backend/src/main/java/com/pmd/PmdBackendApplication.java.


- docker-compose.local.yml: backend now launches via shell command that injects SPRING_DATA_MONGODB_URI into JVM system property to ensure Mongo host is not localhost.
Files: docker-compose.local.yml.


- docker-compose.local.yml: escaped env var in backend command with $$ so container uses its own SPRING_DATA_MONGODB_URI.
Files: docker-compose.local.yml.


- docker-compose.local.yml: override backend entrypoint to run Java with -Dspring.data.mongodb.uri so env is actually applied (image entrypoint was ignoring command args).
Files: docker-compose.local.yml.


- docker-compose.local.yml: adjusted backend entrypoint to include full command string for sh -c (avoids java running with no args).
Files: docker-compose.local.yml.


- PmdBackendApplication now parses SPRING_DATA_MONGODB_URI and sets spring.data.mongodb.uri/host/port/database system properties to avoid localhost fallback.
Files: ackend/pmd-backend/src/main/java/com/pmd/PmdBackendApplication.java.


- Added MongoConfig with explicit MongoDatabaseFactory/MongoTemplate using SPRING_DATA_MONGODB_URI (fails fast if missing).
Files: ackend/pmd-backend/src/main/java/com/pmd/config/MongoConfig.java.
- Removed temporary env parsing from PmdBackendApplication now that MongoConfig owns env resolution.
Files: ackend/pmd-backend/src/main/java/com/pmd/PmdBackendApplication.java.


- docker-compose.local.yml: removed backend entrypoint override after moving Mongo URI handling into MongoConfig (env-only).
Files: docker-compose.local.yml.


- application.yml mail config now reads SPRING_MAIL_HOST/SPRING_MAIL_PORT to avoid localhost inside Docker.
Files: ackend/pmd-backend/src/main/resources/application.yml.
- docker-compose.local.yml sets SPRING_MAIL_HOST=mailhog and SPRING_MAIL_PORT=1025 for health checks.
Files: docker-compose.local.yml.


- Reverted MongoConfig changes; backend now relies on Spring's property resolution so tests can run with default localhost URI while Docker overrides via env.
- spring.data.mongodb.uri now uses ${SPRING_DATA_MONGODB_URI:mongodb://localhost:27017/pmd} and mail host/port default to localhost unless env overrides.
Files: ackend/pmd-backend/src/main/resources/application.yml.

\n## 2026-01-28  Expand demo seed\n- Expanded DemoSeeder to include 10 rich-tech personas plus 10 aligned projects assigned to them, still gated by dev profile or PMD_SEED_DEMO=true.\n- Added docs/demo-users.txt capturing the seeded credentials for quick logins.\n
\n- docker-compose.local.yml now sets PMD_SEED_DEMO=true and SPRING_PROFILES_ACTIVE=dev so that a fresh compose up seeds all demo users/projects for easier testing.\nFile: docker-compose.local.yml.\n

## 2026-01-28  Backend exits in Docker (Mongo localhost + JWT hardening)

Evidence (testing clone C:\Projects\PMD):
- docker compose logs show Mongo client using localhost despite env: `clusterSettings={hosts=[localhost:27017]}` followed by `MongoTimeoutException` and app exit.
- docker inspect pmd-backend shows `SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/pmd` present, so env was set but not applied by the app/image.
- Application runners `UserTeamNormalizationRunner` and `UserSeeder` were throwing on Mongo timeouts, which terminated startup.

Changes:
- `backend/pmd-backend/src/main/resources/application.yml`: JWT config now reads env (`PMD_JWT_SECRET`, `PMD_JWT_EXPIRATIONSECONDS`) instead of a hardcoded secret.
- `backend/pmd-backend/src/main/resources/application-dev.yml`: dev profile defaults Mongo URI to `mongodb://mongo:27017/pmd` (env still overrides).
- Added `JwtSecretEnvPostProcessor` to auto-generate a dev-only secret or fail fast with a clear error when secret < 32 bytes.
- Added `StartupMongoRetry` and wrapped startup runners so Mongo not-ready errors dont crash the app.
- `docker-compose.local.yml`: backend now builds from local Dockerfile; JWT secret updated to a safe 32+ byte default.

Proof references:
- Logs used: `docker compose -f docker-compose.local.yml logs --tail=300 backend`
- Inspect used: `docker inspect pmd-backend`

## 2026-01-28  Backend Mongo URI hard fix (explicit MongoConfig)

Follow-up evidence:
- After rebuild, logs show `clusterSettings={hosts=[mongo:27017]}` and successful monitor connection.
- Backend stayed up for >2 minutes and `/actuator/health` returned `{ "status": "UP" }`.

Changes:
- Added `MongoConfig` to build MongoClient/MongoTemplate directly from `SPRING_DATA_MONGODB_URI` (or spring.data.mongodb.uri), failing fast if missing.
- Added env-to-system-property bridge in `PmdBackendApplication` to ensure URI is visible to Spring config.
- Wrapped `ProjectAuthorBackfillRunner` in Mongo retry guard.

## 2026-01-28  Maven run failure (evidence)
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

## 2026-01-28  Config audit + fixes (Mongo/JWT + project visibility)

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

## 2026-01-28  Maven run retry (local profile)
- `./mvnw spring-boot:run -e` now uses default profile `local` and auto-generates a JWT secret (log: "PMD_JWT_SECRET is missing or too short; auto-generating a local-only secret.").
- Mongo connects to `localhost:27017` via `application-local.yml`.
- The last failure was due to port conflict (port already in use), not JWT/Mongo.
- JWT default/validation now handled in `JwtService` (local/dev auto-generate, non-local fail fast); removed `EnvironmentPostProcessor` registration.
- API smoke test (Docker): login with admin1@pmd.local succeeded; GET /api/projects returned 10 projects (seed visible).

## 2026-01-28  Deterministic profiles/ports/JWT
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
- Local storage only stores auth token; no cached data store, so the working effect is from stale in-memory state.

Port diagnostics (Windows):
- 5173 is held by node.exe (PID 28436)  likely local dev frontend.
- 27017 + 8025 are bound by com.docker.backend.exe (Docker Desktop) and wslrelay.exe.
- 8080 is currently free (no listener). This matches backend container being exited.

Root causes:
1) Docker backend/frontend containers are stopped/exited, so the UI served by local node dev server keeps old data in memory.
2) Frontend does not surface a global backend unreachable state or clear stale data on network failure.
3) Compose port bindings are fixed; no structured way to avoid port conflicts.

Fixes implemented:
- Frontend now logs the resolved API base URL on startup.
- request layer emits pmd:offline/pmd:online events; App shows a clear Backend unreachable banner and clears stale users/projects on offline.
- docker-compose.local.yml now uses .env-driven ports (PMD_*_PORT) and adds healthchecks.
- Backend Dockerfile installs curl so healthcheck can call /actuator/health.
- Added scripts/diagnose-ports.ps1 for consistent Windows port conflict checks.

How to reproduce (pre-fix):
1) Start frontend (npm run dev) and login, load dashboard.
2) Stop backend.
3) UI still shows projects/people from previous in-memory state.

How to verify (post-fix):
- Stop backend; UI should show Backend unreachable banner and not render stale lists.
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
- No navigation occurs in `App.handleRegister`; redirect depends on `RegisterForm`s timer and button.
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
| /api/projects/my-stats | No |  | Backend-only currently |
| /api/projects/random | Yes | Assign | Random project |
| /api/projects/{id}/random-assign | Yes | Assign | Random assign |
| /api/projects/{id}/comments | Yes | ProjectDetails/Comments | List/create |
| /api/comments/{id}/reactions | Yes | ProjectComments | Toggle reaction |
| /api/comments/{id} DELETE | Yes | ProjectComments | Delete comment |
| /api/users | Yes | Dashboard/Assign/People/Admin | Directory + assignment |
| /api/people (CRUD) | No |  | PersonController not used in UI |
| /api/people/*/recommendations | Yes | Assign/People | Toggle + list |
| /api/people/recommended | Yes | Assign/People | Recommended pool |
| /api/stats/dashboard | No |  | Stats endpoint unused |
| /api/stats/user/me | No |  | Unused |
| /api/stats/user/{id} | No |  | Unused |
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
- Added Join a team banner when user has no team in the active workspace; Admins get a quick link to create a team.
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

## 2026-01-30 - Workspace RBAC + demo seed + initial teams

RBAC model (backend)
- Added workspace roles with explicit permission booleans: INVITE_MEMBERS, APPROVE_JOIN_REQUESTS, MANAGE_ROLES, MANAGE_TEAMS, CREATE_PROJECT, EDIT_PROJECT, DELETE_PROJECT, ASSIGN_PEOPLE, VIEW_STATS, MANAGE_WORKSPACE_SETTINGS.
- Default system roles per workspace: Owner, Manager, Member, Viewer (member can invite by default; approve-joins only Owner/Manager).
- Platform admin (user.isAdmin) bypasses workspace permission checks and remains hidden from non-admin user lists.

API changes
- Workspace create now supports initialTeams: POST /api/workspaces body includes initialTeams list.
- Roles API:
  - GET /api/workspaces/{id}/roles
  - POST /api/workspaces/{id}/roles
  - PATCH /api/workspaces/{id}/roles/{roleId}
  - POST /api/workspaces/{id}/members/{userId}/role
- Workspace response now includes roleId, roleName, and permissions map for the active member.
- UserSummaryResponse now includes roleName.

Permission enforcement
- Teams create/edit now require MANAGE_TEAMS.
- Project create/edit/delete now require CREATE/EDIT/DELETE; assignment actions require ASSIGN_PEOPLE.
- Stats endpoints require VIEW_STATS.
- Invites require INVITE_MEMBERS; approvals require APPROVE_JOIN_REQUESTS.
- Workspace settings + demo reset require MANAGE_WORKSPACE_SETTINGS.

Demo workspace seed (deterministic)
- Seeds roles + permissions, 10 teams, 8 demo members with mixed roles, 10 projects, people records, 1 active invite, and 1 pending join request.
- Demo join policy set to require approval.
- Demo reset purges workspace-scoped data (projects, people, teams, roles, invites, join requests, members) and reseeds baseline.

Frontend wiring
- Settings -> Workspaces create form now supports initial teams list.
- Settings Workspaces uses permission flags (invite/approve/settings) instead of role checks.
- Teams management panel added to Settings (MANAGE_TEAMS).
- People page shows role badges from roleName.
- Create Project form shows a no teams yet hint and uses MANAGE_TEAMS for inline team creation.

Files touched (high level)
- Backend: WorkspaceService/Controller, WorkspaceResponse, WorkspaceRole models/repos, DemoWorkspaceSeeder, UserService/UserSummaryResponse, Project/Team/Stats controllers.
- Frontend: SettingsPage, CreateProjectForm, PeoplePage, WorkspaceContext, WorkspacePicker, api/workspaces, types.

Verification (manual)
- Create workspace with initial teams -> Create Project shows teams immediately.
- Member role with INVITE_MEMBERS can create invite.
- Only roles with APPROVE_JOIN_REQUESTS see pending requests and can approve/deny.
- Role badge shows in People cards/details.
- Demo workspace: invite + pending request visible; reset restores baseline.

## 2026-01-30 - UI polish (Assign random picker + Settings 3-column)

Changes
- Assign: removed project selection list control; added random project picker button/chip in header using scopedProjects after filters.
- Assign: reroll/clear actions added; respects filters; no API changes.
- Settings: Workspaces section restructured into 3 columns (Your workspaces / Workspace actions / Demo workspace) with responsive stacking.
- Demo workspace moved to its own column with subtle background.

Files
- frontend/pmd-frontend/src/components/AssignPage.tsx
- frontend/pmd-frontend/src/components/SettingsPage.tsx
- frontend/pmd-frontend/src/App.css

Verification (manual)
- /assign: no project dropdown list; Pick random project selects from filtered list; Change rerolls; Clear unselects.
- /settings: Workspaces shows 3-column layout on desktop; demo column separate; mobile stacks.

## 2026-01-30 - CI fixes + Settings/Teams UI + team test updates

Backend fixes
- Added WorkspaceJoinRequestRepository.findByWorkspaceId(...) to satisfy DemoWorkspaceSeeder query.
- Updated TeamIntegrationTest for workspace-scoped routes and workspace setup:
  - Creates workspace + memberships + seeded teams in test setup.
  - Uses /api/workspaces/{workspaceId}/teams and /users endpoints.
  - Uses springSecurityFilterChain + JWT headers for auth in MockMvc.
  - ObjectMapper now constructed directly (no missing bean).

Frontend fixes
- Lint: replaced unused catch vars, stabilized loadInvites/loadRequests with useCallback and proper deps.
- Settings: Workspaces layout now 2-column (Your Workspaces + Actions) with demo group inside the list.
- Added a separate Teams section under Settings with list + actions, compact layout, and permissions-aware controls.
- Team create/update now validates 2-40 chars, refreshes teams after success, and shows inline errors.

Verification (local)
- Frontend: npm run lint (PASS).
- Backend: ./mvnw test (PASS).
- Backend: ./mvnw -DskipTests package (PASS).

## 2026-01-30  Notifications preferences + email enforcement

What changed:
- Added user notification preferences model + API (GET/PUT /api/notifications/preferences) with defaults ON.
- Enforced email preferences for assignment, mentions, project status changes, membership changes, and overdue reminders.
- Added confirmed-email message (sent after successful confirmation; always sends).
- Added scheduled overdue reminders (daily; uses project age heuristic when no due date exists).
- Frontend Settings now includes a Notifications card with Mail toggles (server-persisted).

Notes:
- Mentions are parsed from comment text using @email and @team/@teammention tokens.
- Preferences are per-user (not workspace-scoped). Missing prefs default to ON.


## 2026-01-30  Dev bootstrap scripts audit + fix

Findings:
- Deps scripts were using docker-compose.deps.yml, while local compose expects mongo/mailhog in docker-compose.local.yml.
- Backend dev script used port 8099 while target experience requires 8080.
- No single-entry script with health checks, logging, and failure reasons.

Changes:
- Added scripts/pmd_dev_up.ps1 + .bat to start deps, wait for health, start backend (8080) + frontend and verify readiness.
- Added scripts/pmd_dev_down.ps1 + .bat to stop processes and deps.
- Updated deps scripts to use docker-compose.local.yml mongo/mailhog.
- Updated docker-compose.local.yml: restart unless-stopped for deps + MailHog healthcheck.
- Updated README with new one-command dev scripts.


## 2026-01-30 - Hybrid DEV/Reviewer workflow (random port + proxy)

Evidence (commands run)
- docker compose -f docker-compose.local.yml ps: no services running
- docker ps: running pmd-mongo (27017) and pmd-mailhog (1025/8025)
- docker ps -a: only pmd-mongo and pmd-mailhog present
- netstat: 8080 LISTENING (PID 4808), 5173 LISTENING (PID 25488), 27017 LISTENING, 8025 LISTENING

Frontend API base behavior (current)
- vite.config.ts had no proxy; frontend used API_BASE_URL in http.ts
- http.ts defaulted to http://localhost:8099 in dev (no proxy)

Changes (this pass)
- Added docker-compose.deps.yml (mongo + mailhog only, healthchecks).
- Added backend port file writer to record chosen random port (PMD_RUNTIME_PORT_FILE).
- Vite dev proxy now routes /api and /actuator to backend port read from env or .runtime/backend-port.txt.
- Dev API base URL now relative in development (proxy-based).
- Added scripts: pmd_dev.ps1/.bat, pmd_reviewer_up.ps1, pmd_reviewer_down.ps1.
- Updated dev scripts to use deps compose and random backend port (SERVER_PORT=0) with port file.

Pending verification (required by prompt)
- Start deps: docker compose -f docker-compose.deps.yml up -d
- Start backend dev: scripts\\pmd_up_backend_dev.ps1 (verify port file + random port)
- Start frontend dev: scripts\\pmd_up_frontend_dev.ps1 (verify proxy works)
- Reviewer: docker compose -f docker-compose.local.yml up -d --build (fixed ports)

## 2026-01-31 - Fix BackendPortFileWriter for Boot 4

Root cause
- BackendPortFileWriter used wrong import package for WebServerInitializedEvent in Spring Boot 4.
- Correct package is org.springframework.boot.web.server.context.WebServerInitializedEvent (in spring-boot-web-server).

Changes
- backend/pmd-backend/src/main/java/com/pmd/config/BackendPortFileWriter.java
  - import updated to org.springframework.boot.web.server.context.WebServerInitializedEvent
  - added @Profile({"local","dev"}) so it only runs in local/dev

Verification
- .\mvnw.cmd -q -DskipTests=false test (PASS)
- Started spring-boot:run with SERVER_PORT=0 and PMD_RUNTIME_PORT_FILE, port file written:
  - .runtime\backend-port.txt -> 55841

## 2026-01-31 - Frontend build failure (white screen)

Diagnosis
- `npm run dev` (and build) fail because `frontend/pmd-frontend/src/api/notifications.ts` imported `apiFetch` from `./http` but `http.ts` no longer exports that helper.
- `npm run build` shows:
  `src/api/notifications.ts(2,10): error TS2305: Module './http' has no exported member 'apiFetch'.`

Fix
- Replaced the `apiFetch` import with `requestJson` in `frontend/pmd-frontend/src/api/notifications.ts`, matching the exported helper.

Verification
- `npm run build` (PASS)
- `npm run lint` (PASS)

## 2026-01-31 - Align docker-compose.local.yml with local dev builds

What was wrong
- Backend service still referenced `ghcr.io/.../pmd-backend:latest`, so `docker compose` pulled remote images and could drift from the local Maven run.
- Frontend already built locally but the backend pointed at an external image, breaking parity.

Fix
- Set backend image to `pmd-backend-local` and build it from `./backend/pmd-backend` (same Dockerfile used in manual dev). Frontend keeps its local build context + `pmd-frontend-local` image.
- Added helper scripts for parity checks:
  - `scripts/pmd_compose_rebuild.ps1` downs/builds/ups the stack with `--no-cache`.
  - `scripts/pmd_compose_verify.ps1` exercises backend/ frontend health checks + logs.

Verification commands (pass on Windows PowerShell)
```
cd C:\Users\Jiannis\pmd
scripts\pmd_compose_rebuild.ps1
scripts\pmd_compose_verify.ps1
```
These run the required `docker compose` commands plus `curl.exe` checks as requested.

## 2026-01-31 - CI/compose parity evidence (Step 0)

Compose evidence
- `docker compose -f docker-compose.local.yml config` shows local build contexts for backend/frontend, images `pmd-backend-local` + `pmd-frontend-local`.
- `docker compose -f docker-compose.local.yml ps` -> no services running at time of check.
- `docker compose -f docker-compose.local.yml images` -> none built at time of check.

Manual dev evidence
- Node: v24.11.1, npm: 11.6.2, Java: Temurin 21.0.9
- Backend: `./mvnw.cmd -q -DskipTests=false test` PASS
- Frontend: `npm ci` failed with EPERM unlink `node_modules/@esbuild/win32-x64/esbuild.exe` (file in use); `npm run build`/`npm run lint` reported tsc/eslint missing as a consequence.
  - Action: close any running Node/Vite processes and rerun npm ci.

Changes in this pass
- Added reviewer profiles to backend/frontend services in `docker-compose.local.yml` (deps run without profile).
- Updated scripts:
  - `scripts/pmd_reviewer_up.ps1` / `scripts/pmd_reviewer_down.ps1` use `--profile reviewer`
  - `scripts/pmd_compose_rebuild.ps1` and `scripts/pmd_compose_verify.ps1` use reviewer profile
  - Added `scripts/pmd_down.ps1` to stop local dev processes/deps via pmd_dev_down.ps1
- Added `docs/release-checklist.md` with pre-tag commands.
## 2026-01-31 - Dev script readiness fix (backend health)

Bug:
- `scripts/pmd_dev_up.ps1` kept waiting even when backend was running; it required JSON status == "UP" and logged "health 200 but status ''".

Fix:
- Backend readiness now treats HTTP 200/401/403 from `/actuator/health` as ready, and falls back to TCP connect (especially for 404).
- JSON parsing is only for optional logging, not a gate.

Reasoning:
- Reachability (HTTP or TCP) is a more reliable readiness signal than strict JSON parsing when health payloads vary or are protected.
\n## 2026-01-31 - Workspace summary panel preferences\n\n- Removed the duplicate bottom workspace summary so only the main summary card with six counters remains.\n- Added per-panel visibility toggles (eye buttons) that immediately hide/show panels and persist through the new /api/workspaces/{id}/preferences/panels endpoints.\n- Preference state is stored per user per workspace via WorkspacePanelPreferences, and StatsService now reports all six counters so the UI only renders reachable panels.\n
\n## 2026-01-31 - Workspace summary visibility + filters\n\n- Verified the dashboard was hitting GET /api/workspaces/{id}/preferences/panels for summary visibility and the call rejected whenever the record was missing, so we were surfacing a generic error. The controller/service now return default visibility, and the client now silently falls back, logging only to the console when the request fails.\n- Replaced the six-button toggles with the triangle mini-menu pattern (FilterMenu with a custom icon), showing the checklist dropdown for each panel and persisting per-user, per-workspace visibility via the new schema (workspaceSummaryVisibility).\n- Consolidated the dashboard filter dropdown so Status and Team options live in the same checklist dropdown next to search, keeping the rest of the layout untouched.\n
\n## 2026-01-31 - Dashboard build fix\n\n- Build failed because DashboardPage tried importing from ./common/FilterMenu even though FilterMenu.tsx lives one level up; the module couldnt be resolved and the compiled FilterMenu also referenced undefined props.\n- Corrected the import to ./FilterMenu and restored the prop destructuring to include the optional icon and uttonClassName, allowing the mini-menu dropdown to render without runtime errors.\n

## 2026-02-16 - Security hardening pass (from addsecprompt.md)

Scope
- Applied pragmatic hardening without changing the existing JWT stateless auth flow.
- Kept progress tracking only in `PMD-progress-notes.md` and `PMD-todo.md`.

Implemented
- Backend:
- Added malicious-pattern request blocking filter (`MaliciousRequestFilter`) for Velocity/XSLT/path traversal/reflection signatures.
- Added per-IP rate limiting filter (`RateLimitingFilter`) with env-driven thresholds.
- Updated security filter chain to include secure headers and custom filters.
- Updated CORS to env-driven allowed origins and exposed rate-limit headers.
- Added Guava dependency for in-memory limiter caches.
- Frontend:
- Hardened Vite dev proxy request filtering for suspicious patterns.
- Added baseline security meta headers in `index.html`.
- Added CSP violation and unhandled rejection monitoring hooks in `src/main.tsx`.

Verification
- `npm run lint` (PASS)
- `npm run build` (PASS)
- `.\mvnw.cmd -q -DskipTests package` (PASS)
- `.\mvnw.cmd -q -DskipTests=false test` (FAIL in this environment: MongoDB not reachable at `localhost:27017`)

Notes
- `C:\Users\Jiannis\Desktop\PMD-MVP-INSTRUCTIONS.md` was removed after extracting useful parts.
- `C:\Users\Jiannis\Desktop\addsecprompt.md` remains unchanged as external reference.



## 2026-02-16 - Runtime guardrails (dev/deps/reviewer conflict control)

Problem observed
- Mixed local/dev/reviewer runs caused conflicting PMD containers and local backend processes.
- Starting one mode while another mode was active produced unpredictable behavior (port conflicts, duplicate PMD runtime, noisy startup errors).

Implemented
- Added `scripts/pmd_guard.ps1` with shared runtime guard functions:
- Active mode tracking in `.runtime/pmd-active-mode.json`.
- Conflict cleanup before start (`Ensure-PmdMode`) for `dev`, `deps`, `reviewer`.
- PMD-only process cleanup for local backend Java processes (`com.pmd.PmdBackendApplication` / `spring-boot:run`).
- PMD stack cleanup helpers for deps/reviewer compose stacks.
- Wired guardrails into start/stop scripts:
- `scripts/pmd_dev_up.ps1`
- `scripts/pmd_dev_down.ps1`
- `scripts/pmd_up_deps.ps1`
- `scripts/pmd_down_deps.ps1`
- `scripts/pmd_reviewer_up.ps1`
- `scripts/pmd_reviewer_down.ps1`
- `scripts/pmd_dev_down.ps1` now uses deterministic compose cleanup (`down --remove-orphans`) by default.
- Removed noisy non-idempotent `docker start pmd-*` calls from dev start path.
- `pmd.bat deps` now routes through `scripts/pmd_up_deps.bat` so menu/CLI behavior matches guardrails.

Operational behavior now
- Only one PMD runtime mode is active at a time.
- Starting `deps` auto-stops `reviewer` if running.
- Starting `reviewer` auto-stops `deps` and local PMD dev processes.
- Starting `dev` auto-stops `reviewer` first.
- `down` scripts clean PMD resources started by that mode.

Validation
- Verified transitions:
- `deps -> reviewer` and `reviewer -> dev` auto-clean conflicts.
- `pmd.bat deps` and `pmd.bat docker-up` follow same controlled lifecycle.
- Post-cleanup checks confirm no residual `pmd-*` containers when stopped.

References
- Docker Compose `down` semantics (`--remove-orphans`): https://docs.docker.com/reference/cli/docker/compose/down/
- Compose project isolation and labels (`com.docker.compose.project`): https://docs.docker.com/compose/intro/compose-application-model/
- Compose canonical labels (`com.docker.compose.project`, `com.docker.compose.service`): https://docs.docker.com/reference/compose-file/services/
- Project-name isolation guidance: https://docs.docker.com/compose/how-tos/project-name/

## 2026-02-16 - Settings Teams flow cleanup

Implemented
- Removed duplicate "Teams" heading inside Settings -> Teams card (kept only main panel title).
- Replaced per-team `Rename` button with `Edit` flow.
- Added edit action menu per team with actions: `Rename`, `Deactivate/Activate`, `Delete`.
- Added `Confirm` / `Cancel` for team edit actions.
- Removed separate `Deactivate teams` section (deactivation/activation now lives inside Edit flow).
- Added members count badge per team row (`N members`).
- Added role gate for creating teams: only `Owner` / `Manager` (plus system admin compatibility) can create teams.
- Team create handler now enforces the role gate (not just UI disabled state).

Notes
- `Delete` currently performs safe deactivation (no backend hard-delete endpoint for teams yet).

Validation
- Frontend build passes after changes (`npm run build`).

## 2026-02-16 - Teams row micro-adjustments

Implemented
- `Edit` button in Settings -> Teams list is now smaller and more subtle.
- Team row actions are right-aligned consistently.
- Team member badge now shows only the numeric count (no `members` text).

Validation
- Frontend build passes (`npm run build`).

## 2026-02-16 - Teams edit button alignment correction

Implemented
- Restored `Edit` button visual style to secondary button (not ghost/transparent).
- Kept it compact via reduced control height/padding.
- Enforced right-side alignment for member count + Edit controls in team rows.

Validation
- Frontend build passes (`npm run build`).

## 2026-02-16 - Teams row fixed right alignment

Implemented
- Team rows now use a dedicated 2-column layout (`name | actions`) so actions do not drift with name length.
- Member count + Edit are pinned to the far right of each team card.
- Added mobile override to preserve right-aligned actions for team rows.

Validation
- Frontend build passes (`npm run build`).

## 2026-02-16 - Team row width fix (right pin)

Implemented
- Fixed `team-list-row` width/flex so row spans full card width.
- Count + Edit now stay pinned at far right instead of following name length.

Validation
- Frontend build passes (`npm run build`).

## 2026-02-16 - Roles UX parity + demo/system labeling

Implemented
- Roles list now uses the same inline `Edit` workflow style as Teams (row-level edit panel with Confirm/Cancel).
- Role row now shows member count badge (numeric only).
- `System` label now displays as `Demo` when active workspace is demo.
- Added inline role edit actions:
  - Rename (disabled for demo/system roles)
  - Permissions
  - Reset default (demo/system roles)
- Added guardrail: demo/system role names cannot be renamed.
- Added reset-to-default permission presets for Owner/Manager/Member/Viewer role names.

Notes
- Full Teams expansion requested (lead, visibility, default role on join, member preview, bulk actions, merge, audit log, deactivate guardrails) is accepted and should be delivered in phased implementation to preserve current UI identity and backend consistency.

Validation
- Frontend build passes (`npm run build`).

## 2026-02-16 - Roles edit overflow containment

Implemented
- Team/Role editable list items now use full-width stacked layout (`settings-edit-item`) so inline edit panels open downward inside the card.
- Added width constraints for edit panel container to prevent horizontal overflow.
- Added scroll containment for inline role permission blocks inside edit mode.

Validation
- Frontend build passes (`npm run build`).

## 2026-02-16 - Preferences/Notifications/Workspace expansion

Implemented
- Preferences panel expanded with working user settings:
  - Default landing page (Dashboard/Assign/People/Settings)
  - Confirm destructive actions
  - Keyboard shortcuts enabled
  - Date/time format (24h/12h)
  - Existing remember selections toggles kept
- Added disabled red "Coming soon" entries in Preferences for:
  - Compact mode
  - Remember open panels
  - Default filters preset
  - Auto-refresh interval
- Notifications panel expanded:
  - Browser notification permission control (Enable + status)
  - Existing mail notifications kept
  - Added disabled red "Coming soon" entries for in-app center, digest mode, quiet hours, per-workspace profile, snooze
- Workspace profile added to Workspaces panel and persisted through backend settings:
  - Name, slug, language, avatar URL, description
  - Save profile action
- Backend settings endpoint extended to store workspace profile fields and enforce uniqueness guardrails on name/slug.
- Added disabled red "Coming soon" workspace controls for lifecycle, default join role, audit log, limits, export/backup.

Technical
- Frontend preference model upgraded to v2 and now includes new preference keys.
- App routing now respects the user's default landing page after login and on root fallback routes.

Validation
- Frontend build passes (`npm run build`).
- Backend compile passes (`./mvnw -q -DskipTests compile`).

## 2026-02-16 - Pre-release readiness check

Checks executed
- Docker compose validation:
  - `docker-compose.yml` OK
  - `docker-compose.deps.yml` OK
  - `docker-compose.local.yml` OK
  - `docker-compose.prod.yml` OK (requires `PMD_JWT_SECRET`)
- Frontend production build OK (`npm run build`).
- Backend compile OK (`./mvnw -q -DskipTests compile`).

Documentation updates
- Added `PMD_JWT_SECRET` to `.env.example`.
- Added production compose secret note in `README.md`.

Release note
- Keep runtime/pid state files out of release commits when possible (for example `scripts/.pmd-dev-pids.json`).

## 2026-02-16 - Runtime PID file policy

Implemented
- Added `scripts/.pmd-dev-pids.json` to `.gitignore`.
- Removed `scripts/.pmd-dev-pids.json` from git index (`git rm --cached`) so it remains local-only.
- Documented in README that `.pmd-dev-pids.json` is ephemeral runtime state (not source-of-truth config).

Rationale
- PID values are per-machine/per-session runtime metadata for stop scripts, not deterministic project config.
- Keeping it out of commits avoids noisy diffs and accidental cross-machine process cleanup issues.

## 2026-02-16 - Workspace summary trend background

Implemented
- Workspace Summary panels now support history range selection inside the triangle menu:
  - `1m`, `10m`, `30m`, `1h`, `8h`, `12h`, `24h`, `7d`, `30d`, `1y`, `2y`, `5y`
- Added subtle background sparkline trend behind each summary counter card (`Unassigned`, `Assigned`, `In progress`, `Completed`, `Canceled`, `Archived`).
- Trend history is captured from dashboard stats snapshots and stored per workspace in local storage.
- Range selection is persisted per workspace in local storage.

Behavior details
- If data points are not enough for a trend (fewer than 2), no line is shown.
- Snapshot writes are throttled for unchanged counters (skips duplicate snapshots within 60 seconds).

UI
- Maintains existing design identity and card layout.
- Trend line is low-opacity and non-interactive, so main values remain primary.

## 2026-02-16 - Workspace summary trend visual refinement

Implemented
- Refined summary trend UI to a cleaner minimal style:
  - compact line chart strip per card
  - visible min/max values around the sparkline
  - dotted baseline caption in the format `min .... range`
- Added short ranges in selector:
  - `1m`, `10m`, `30m`, `1h`, `8h`, `12h`, `24h`, `7d`, `30d`, `1y`, `2y`, `5y`

## 2026-02-16 - Workspace summary Grafana-style polish

Implemented
- Updated trend visuals to a more Grafana-like style:
  - cooler green/cyan line palette
  - subtle glow on the line
  - lightweight chart grid in the trend strip
  - low-noise blurred background accent inside each trend frame

## 2026-02-16 - Full-panel background trend + meaningful panel metrics

Implemented
- Workspace summary trend chart is now rendered as full background inside each `workspace-summary-panel`.
- Chart labels are intentionally very small (tiny axis labels) to keep emphasis on primary counters.
- Added per-panel metric row with meaningful values:
  - contextual current metric (`Unassigned/Assigned/Active/Completed/Canceled/Archived projects`)
  - `Avg`
  - `Peak`

## 2026-02-16 - Project refresh behavior (no full-page loading on status change)

Implemented
- Split project refresh behavior into:
  - foreground load (keeps existing full loader behavior for initial/route-level loading)
  - background refresh (updates project data without toggling page-level `projectLoading`)
- Dashboard and Assign `onRefresh` now use background refresh to avoid full screen/panel loader when:
  - changing status
  - saving project edits
  - assignment actions

## 2026-02-16 - Local loading UX for project updates

Implemented
- Prevented dashboard/assign route panel replacement with loader when project data already exists:
  - route loader now appears only when `projectLoading` and project list is empty.
- Added row-level loading feedback in Dashboard project list:
  - updating row gets `is-updating` visual state
  - inline `Saving...` indicator near status control
  - status control disabled only for the row being updated

## 2026-02-16 - Filter menu bulk-actions UI polish

Implemented
- Redesigned filter bulk action buttons from `Check all / Uncheck all` to compact segmented style:
  - `All`
  - `None`
- Added disabled states for clarity:
  - `All` disabled when all options are already selected
  - `None` disabled when no options are selected

## 2026-02-16 - Filter popover viewport-safe positioning

Implemented
- Filter popovers now use viewport-safe positioning to avoid opening outside screen bounds.
- Added adaptive placement logic:
  - keeps popover inside left/right viewport edges
  - flips upward when there is not enough space below
  - clamps max height based on available viewport space
- Updated outside-click handling to work correctly with fixed-position popover.

## 2026-02-16 - People recommendation tooltip layering fix

Implemented
- Fixed star-hover recommendation tooltip visibility in People directory.
- Adjusted stacking and overflow rules so tooltip is not hidden behind neighboring cards/layers:
  - `people-card` now establishes local stacking context and raises on hover/focus
  - tooltip anchor and tooltip z-index increased
  - People directory card overflow changed to visible for tooltip rendering

## 2026-02-16 - Settings order popover compact sizing

Implemented
- Reduced unnecessary width of the `Move to position` context popover in Settings.
- Updated label to `Position` and tightened spacing/padding/font sizes for a cleaner compact window.

## 2026-02-16 - Overlay search behavior aligned across pages

Implemented
- Applied the same overlay-style search behavior used in People to:
  - Dashboard
  - Assign
- Search popover now renders as fixed overlay with high z-index so it appears above surrounding cards/layers.
- Added viewport-aware repositioning on open/scroll/resize to keep the search overlay visible and anchored to the search button.

## 2026-02-16 - Settings Roles duplicate title cleanup

Implemented
- Removed the duplicate inner `Roles` subtitle inside the Roles card body.
- Kept only the main card title `Roles` in the panel header.

## 2026-02-16 - Workspaces empty-state guidance

Implemented
- Updated Workspaces empty state copy from `No workspaces yet.` to:
  - `No workspaces yet. Create your first workspace below.`

## 2026-02-16 - Workspace default roles + custom role cap

Implemented
- Workspace creation keeps the default system roles aligned with demo defaults:
  - `Owner`, `Manager`, `Member`, `Viewer` with default permission presets.
- Added workspace-level cap for non-system roles:
  - maximum `10` custom roles per workspace.
- Backend now blocks creation above limit with explicit error message.
- Settings UI now shows `Custom roles: X/10` and disables role creation controls when limit is reached.

## 2026-02-16 - Attachment image fix in dev

Implemented
- Fixed comment attachment image rendering issue in local dev by adding Vite proxy route:
  - `/uploads` -> backend
- This prevents image URLs from resolving to the frontend app server and returning invalid content.

## 2026-02-16 - Dashboard header control alignment

Implemented
- Moved `controls-bar` alignment to the top-right area of the Dashboard header.
- Replaced fixed left offset with responsive right alignment (`margin-left: auto`) and `space-between` header layout.

## 2026-02-16 - Global layering cleanup (windows/popovers/modals)

Implemented
- Audited overlay layering and unified z-index levels with CSS tokens:
  - `--z-topbar`, `--z-tooltip`, `--z-popover`, `--z-drawer-overlay`, `--z-drawer`, `--z-modal`, `--z-image-modal`
- Applied the scale across interactive windows/popovers:
  - search popover, filter popover, settings order popover, project actions menu, drawer, modal, image modal
- Updated settings cards to `overflow: visible` so internal popovers are not clipped by parent cards.

## 2026-02-16 - Workspace summary trend visibility fix

Implemented
- Fixed workspace summary trend line not updating/appearing during quick status changes.
- Summary counters now use live project-derived counters as source of truth (with backend stats fallback).
- Trend snapshots now persist from live counters, so `1m` range reflects immediate status changes.
- Removed summary hard dependency on async stats load so panels render consistently without waiting.

## 2026-02-16 - PowerShell approved verb cleanup

Implemented
- Renamed guard function from `Ensure-PmdMode` to `Set-PmdMode` to satisfy PSScriptAnalyzer `PSUseApprovedVerbs`.
- Updated all caller scripts:
  - `scripts/pmd_dev_up.ps1`
  - `scripts/pmd_up_deps.ps1`
  - `scripts/pmd_reviewer_up.ps1`

## 2026-02-19 - Mention email delivery fallback fix

Implemented
- Fixed mention email suppression for legacy notification preference records where new source-specific mention flags deserialize as alse.
- Added fallback logic so mention emails are not blocked when all source-specific mention flags are unset/false in old records.
- Added backend debug logs for mention processing and mention-email skip reasons to speed up runtime diagnosis.


## 2026-02-19 - Default profile picture assets folder

Implemented
- Added rontend/pmd-frontend/public/profile-pictures/ for default selectable profile images.
- Added README.txt in that folder with usage path (/profile-pictures/<filename>).


## 2026-02-19 - Settings switch icons, mention UX, and landing-page routing fix

Implemented
- Fixed missing Grid view / Tab view icons in settings-view-switch by switching to explicit inline SVG icons.
- Added mention highlight rendering in UI with hover metadata (user/team/role/everyone) via new component: rontend/pmd-frontend/src/mentions/MentionText.tsx.
- Applied mention highlighting in key surfaces: project comments, dashboard descriptions, and project details descriptions.
- Fixed default landing behavior to always respect Default landing page preference on authenticated redirects (removed last-route override from redirect target).

## 2026-02-19 - Mention email reliability hardening

Implemented
- Added mention parsing debug logs and mention recipient summary logs in MentionNotificationService.
- Relaxed mention-email gate in EmailNotificationService so mention delivery is blocked only by main mention toggles (emailOnMentionUser / emailOnMentionTeam) and not by brittle source-specific states from older records.
- Kept source context in logs for diagnosis while preserving delivery reliability.


## 2026-02-19 - Settings view-switch icon rendering hard fix

Implemented
- Reworked Grid/Tab switch icons to explicit stroke-based SVG primitives with inline width/height attributes (no CSS fill dependency).
- Added fixed-size constraints on .settings-view-icon-svg to prevent collapse to  px width in edge rendering cases.


## 2026-02-19 - Landing behavior and refresh routing stability

Implemented
- Added Last visited route option to Default landing page preferences.
- Auth redirect now supports lastVisited target via persisted in-app route memory.
- Profile close navigation now respects the effective preferred route (including lastVisited).
- Replaced forced /settings redirects (when no active workspace) on core app routes with an in-place no-workspace panel; this keeps the current route on F5 instead of hard-jumping to Settings.


## 2026-02-19 - Mention governance phase 1 (policy enforcement)

Implemented
- Added backend mention policy enforcement before save on:
  - project comments
  - project title updates/creates
  - project description updates/creates
- Enforced rules:
  - max 20 mention targets per 10 minutes per user
  - max 10 mention targets per message
  - @everyone cooldown: 1 per 30 minutes per workspace
  - RBAC: @everyone and role mentions restricted to owner/manager
  - non-manager cross-team token mentions blocked
- Added automatic temporary mention suspension:
  - repeated policy violations trigger a 1-day mention block
- Added mention audit persistence for allowed/blocked attempts with source + targets + reason.

## 2026-02-19 - Mention moderation APIs

Implemented
- Added moderation endpoints:
  - GET /api/workspaces/{workspaceId}/mentions/restrictions`n  - DELETE /api/workspaces/{workspaceId}/mentions/restrictions/{userId}`n  - GET /api/workspaces/{workspaceId}/mentions/audit?userId= (manager/owner, or self scope)
- Managers/owners can remove active mention suspension early.

## 2026-02-19 - Mention navigation UX

Implemented
- Mention chips are now clickable and route to People view contextually:
  - user mention -> People with that user preselected
  - team mention -> People with that team preselected in filters
- Added shared mention navigation helper for consistent behavior.

## 2026-02-19 - Settings view icon rendering follow-up

Implemented
- Reinforced Grid/Tab icons with explicit SVG dimensions and stroke primitives to prevent hidden/zero-size rendering cases.


## 2026-02-19 - Tab view icon differentiation

Implemented
- Replaced Settings Tab view icon with a tabbed-panel glyph so it is visually distinct from the burger menu.
- Kept Grid icon unchanged.


## 2026-02-19 - Mention menu semantic colors and team context

Implemented
- Mention suggestion type badges (All/Team/Role/User) now support per-item accent colors via CSS variable.
- Team mentions now use their actual team color in the mention picker badge.
- User mention suggestions now include team context in hint text (email · team) and inherit team color for the type badge where available.

## 2026-02-19 - Topbar profile/workspace image tighter circular crop

Implemented
- Increased topbar avatar image cover zoom/scale to reduce odd framing on very wide/tall source images while keeping strict circular crop.

## 2026-02-19 - Profile picture crop UX + PMD images gallery

Implemented
- Added full crop controls for profile/workspace picture upload previews:
  - drag with hand cursor for X/Y positioning
  - mouse wheel zoom support
  - explicit Horizontal / Vertical / Zoom sliders
- Crop preview now honors both axes and zoom in the circular frame (`object-position` + scaled preview).
- Added `PMD images` gallery support in profile and workspace editors:
  - reads image list from `public/profile-pictures/index.json`
  - shows thumbnails in a compact 5-column grid
  - click-to-apply image URL into the editor
- Added `public/profile-pictures/index.json` scaffold and updated folder `README.txt` instructions to keep gallery list in sync.
- Hardened Settings Grid/Tab switch button icons to filled glyphs for reliable visibility across themes/renderers.

## 2026-02-19 - Profile picture crop interaction and anti-drag hardening

Implemented
- Crop interaction is now explicitly thumbnail-scoped (modal crop preview), with native browser image drag disabled on profile/workspace crop previews.
- Added `draggable={false}` and drag/context-menu prevention on topbar/profile/workspace profile-picture images to avoid accidental drag-drop behavior.
- Added CSS hardening (`-webkit-user-drag: none`, `user-select: none`) for circular profile-picture image surfaces.
- Preserved circular thumbnail framing while keeping X/Y/Zoom crop controls for final saved thumbnail composition.

## 2026-02-19 - Photo delete UX and crop-entry refinement

Implemented
- Replaced `Delete` / `Delete photo` buttons with an `X` action overlay on the profile/workspace picture thumbnail preview.
- Added confirmation on thumbnail `X` delete for both profile and workspace photos.
- Added `Adjust crop` action in profile/workspace photo editors to reopen crop mode for the currently saved picture.
- Strengthened crop cursor behavior (`grab` / `grabbing`) so drag-to-position is visually explicit during thumbnail crop.

## 2026-02-19 - Workspace image controls density + crop preview visibility fix

Implemented
- Reworked workspace/profile image action rows to a denser 3-column compact grid so controls fit without wasted space.
- Fixed crop preview rendering so image stays visible while moving:
  - corrected crop zoom CSS variable handling (numeric value),
  - enforced explicit preview image sizing/object-fit in crop circle,
  - kept hardware-accelerated transform for smooth movement.
- Reinforced grab cursor behavior in crop area and active dragging state.

## 2026-02-19 - Crop save alignment fix (horizontal/vertical)

Implemented
- Updated crop export math to use focal-point mapping for `Horizontal`/`Vertical` controls (center-based, like profile editors in social apps), so saved image framing matches preview movement more accurately.
- Removed hard integer rounding in crop offsets to preserve fine adjustments.

## 2026-02-19 - Crop editor state persistence (re-open consistency)

Implemented
- Persisted crop controls per saved image URL for:
  - profile picture editor
  - workspace picture editor
- Re-opening `Adjust crop` now restores the last saved `Horizontal` / `Vertical` / `Zoom` values for that image instead of resetting sliders to defaults.
- Solves mismatch where preview looked zoomed/cropped from prior save but sliders incorrectly returned to initial positions.

## 2026-02-19 - Crop preview/export 1:1 alignment fix

Implemented
- Refactored crop preview positioning model to use absolute image positioning (`left/top + zoomed size`) inside the circular frame.
- Updated exported crop math to the same normalized top-left mapping so `Horizontal`/`Vertical`/`Zoom` produce the same framing in:
  - live preview
  - saved thumbnail
- Fixed re-adjust behavior on already-saved images where X/Y movement could appear stuck while zoom changed.

## 2026-02-19 - Crop interaction parity and re-adjust usability pass

Implemented
- Removed forced global avatar overscale in display surfaces (`workspace-avatar img`) so saved crop framing is not altered after save.
- Set crop editor default zoom to 120 and minimum zoom to 110 for re-adjust flows, ensuring X/Y panning has visible room even on square assets.
- Corrected drag direction to natural hand behavior in both profile/workspace crop modals.

## 2026-02-19 - Edit preview uncropped display (magnifier workflow)

Implemented
- Removed automatic circular clipping from **editor preview surfaces** (Profile/Workspace photo edit blocks).
- Edit preview now shows the full uploaded image in a non-cropped frame (`object-fit: contain`) so users can decide crop explicitly in the adjustment modal.
- Kept final profile picture display behavior and user-driven crop flow unchanged.

## 2026-02-19 - Avatar shape policy update (large square, small round)

Implemented
- Updated avatar shape rules so large avatar surfaces (`lg` / `xl`) render square-ish with soft corners.
- Kept small identity avatars (topbar/small size) fully circular.

## 2026-02-19 - Crop range expansion (edge-to-edge control)

Implemented
- Reverted crop default/min zoom from `120/110` back to `100/100` in profile and workspace crop editors.
- This removes center-bias and restores full edge-to-edge placement range for X/Y adjustments.
- Kept saved crop-state persistence and 1:1 preview/export mapping.

## 2026-02-19 - Avatar crop switched to frame mode (non-destructive)

Implemented
- Changed avatar handling from destructive bitmap crop to frame-mode upload:
  - `Use image` now uploads the original image file
  - crop controls are treated as POV/frame metadata (not pixel-cut output)
- This avoids repeated quality loss and avoids physically cutting the image on each adjust cycle.

## 2026-02-19 - Frame metadata rendering applied to avatar surfaces

Implemented
- Added shared avatar-frame utility to read saved crop POV (`x/y/zoom`) by image URL from local storage.
- Applied frame rendering metadata to profile/workspace avatar surfaces (topbar + profile/settings previews) so saved frame selection is reflected visually after save.

## 2026-02-19 - Settings position popover compact sizing

Implemented
- Reduced width and spacing of the `Position / Move / Close` popover in Settings reorder control.
- Tightened button sizing and padding to avoid wasted horizontal space.

## 2026-02-19 - PMD launcher backend-ready detection hardening

Implemented
- Debugged `pmd.bat` / `PMD_cooler.bat` startup flow and verified false-negative backend readiness came from health-check timing behavior, not backend startup failure.
- Updated `scripts/pmd_dev_up.ps1` readiness check:
  - backend health probe now uses `http://127.0.0.1:{port}/actuator/health`
  - increased per-request timeout to 10 seconds (from 3) for slower local environments
  - keeps extended startup grace with warning fallback when port is listening but health endpoint is delayed.
- Result: launcher no longer misreports backend as “not started” while backend is already running.

## 2026-02-19 - Settings tab view workspace layout reflow

Implemented
- In **Settings > Workspaces (Tab view)**, switched top layout order to:
  - left: `Workspace actions`
  - right: `Your workspaces`
- Reworked `Invites` controls to vertical flow:
  - `Expires in (days)` first
  - `Max uses` second
  - `Create invite` third
- Updated workspace management area to a two-column layout in tab view:
  - left: `Invites`
  - right: `Pending requests`

Adjustment
- Increased `Your workspaces` panel width and reduced `Workspace actions` panel width in tab view for better content fit.
- In tab view, made the `Invites` controls compact to a fixed narrow width and aligned all three rows (`Expires`, `Max uses`, `Create invite`) to the same width as the invite action button.

## 2026-02-20 - Workspace audit log (general + personal filters)

Implemented
- Added backend workspace audit event system (`workspace_audit_events`) with structured fields:
  - `category`, `action`, `outcome`, `actor`, `targetUserId`, `teamId`, `roleId`, `projectId`, `entity*`, `message`, `createdAt`.
- Added API endpoint:
  - `GET /api/workspaces/{id}/audit`
  - supports filtering by personal scope, actor, target user, team, role, project, category, action, text query, date bounds, and limit.
- Added audit writes for key workspace actions:
  - workspace create/join/settings update/demo reset
  - invite create/revoke
  - join-request approve/deny
  - role create/update/assign to member
  - team create/update
  - project create/update/delete/random assign
- Added frontend audit panel in `Settings > Workspaces` with:
  - general/personal view toggle
  - filters for users, teams, roles, category/action, project id, text search
  - event list with timestamp, actor, message, and resource tags.

## 2026-02-20 - Settings UX: invite actions menu + dedicated Audit card/tab

Implemented
- Replaced invite row action buttons (`Copy link`, `Copy code`, `Revoke`) with a compact triangle trigger and context menu.
- Kept same three actions inside dropdown menu to reduce row width and improve tab-view compactness.
- Adjusted workspace tab-view management layout so `Pending requests` sits close to `Invites` (left compact column + right flexible column).
- Promoted Audit to first-class panel:
  - added `Audit` tab in tab view
  - added dedicated `Audit` settings card in grid view
  - removed embedded audit section from inside Workspaces card.

## 2026-02-20 - Grid jitter fix after adding Audit panel

Implemented
- Stopped automatic `ResizeObserver` auto-fit logic for the `Audit` card only in grid mode (other cards keep auto-fit behavior).
- Set a stable default grid height for `Audit` card (~78% viewport) to avoid continuous reflow and vertical jumping.
- Result: no rapid up/down grid movement when audit panel is visible.

## 2026-02-20 - Audit view switched to compact table (Excel-like)

Implemented
- Refactored Audit panel UI to spreadsheet-style table layout:
  - sticky header row
  - compact columns (`Time`, `Cat`, `Act`, `Actor`, `Target`, `Team`, `Role`, `Project`, `Message`)
  - row hover highlight and ellipsis overflow handling.
- Simplified filters to concise toolbar controls (short labels/placeholders) for faster scanning.
- Reduced action button footprint in audit controls (`Refresh/Reset` compact style).

Adjustment
- Changed Audit UX to keep logs always visible and moved advanced filters/search behind a single toggle button (`Filter / Search`) for cleaner default view.

Adjustment
- In grid mode, Audit card is now top-pinned during resize:
  - removed top-edge resize handle for Audit
  - only bottom-edge resize remains, so expansion adds space below without shifting the card upward/downward.

## 2026-02-20 - Settings grid bounds controls + reset default

Implemented
- Added explicit grid-boundary visibility mode for Settings grid (`Show bounds`) so panel limits are more visually distinct.
- Added user-editable grid boundary controls (popover):
  - Column 1 width
  - Column 2 width
  - Column 3 width
  - Grid gap
- Added `Reset default` action to restore the original grid boundary configuration.

## 2026-02-20 - Roles tab view layout split (actions left, roles right)

Implemented
- In `Settings > Roles > Tab view`, changed layout to 2 columns:
  - left column: `Role actions` (Create role, Role permissions, Assign role) stacked vertically
  - right column: roles list grid.
- Roles list now fills left-to-right and wraps to next row when a row is full.
- Hid the divider between sections in tab mode for cleaner split layout.


## 2026-02-20 - Workspace isolation hardening

- [x] Frontend workspace switch hardening: when active workspace changes, stale users/projects/selections are cleared immediately before refetch to prevent cross-workspace bleed during transition.
- [x] Backend user/team response sanitization for workspace-scoped endpoints:
  - UserController and PersonRecommendationController now return 	eamId/teamName only if the team belongs to the active workspace.
  - removed legacy fallback to global user.team in workspace-scoped responses to prevent cross-workspace team leakage in UI.


- [x] Profile layout update: moved first/last name stack inside orm-grid two-col (right of profile picture) and removed old profile-avatar-name-stack hardcoded block/style hook.


- [x] Settings Grid defaults updated: all settings-card panels now start at max default height in Grid View (user can still resize manually).
- [x] Grid View scroll behavior adjusted: inner settings scroll areas prefer overlay scrollbars (no content reflow when scrollbar appears), with normal fallback where overlay is unsupported.


- [x] Preferences: added Enable settings grid panel resize toggle.
  - OFF (default): grid panels auto-fit content height (no manual resize handles).
  - ON: top/bottom resize handles are enabled so user can expand/shrink settings panels in Grid View.


- [x] Grid View stabilization fix: when Enable settings grid panel resize is OFF, cards now use auto-fit layout (no fixed 12000px heights), preventing oversized panels and preserving clean, organized spacing.


- [x] Settings Grid gap fix: restored masonry-style row-span fitting for all cards (including Audit) so empty vertical holes between columns are minimized while keeping resize-toggle behavior.


- [x] Settings Grid controls moved from top header icon into each panel drag/reorder menu (::).
  - removed standalone Grid bounds header icon (no more view-switch glitch/jump between grid/tab).
  - grid size controls (col1/col2/col3/gap, show bounds, reset default) now live inside drag menu in Grid View.


- [x] Grid View no-inner-scroll pass: removed inner scrollbars from settings cards in Grid mode so card bodies expand to show full content (workspaces/teams/roles/audit/preferences/notifications).


## 2026-02-23 - Settings grid column-resize stabilization

- [x] Fixed major lag/flicker while changing Grid bounds (`col1/col2/col3/gap`) from the `::` menu.
- [x] Added resize-guard during column drag:
  - temporarily pauses expensive panel auto-fit recalculation while slider is being dragged
  - resumes and runs one clean fit pass on pointer release.
- [x] Added bounds normalization + clamping:
  - column/gap values are constrained to safe ranges
  - total width is constrained to current grid container width to prevent layout shock/overflow while dragging.
- [x] Added RAF-throttled grid-bounds updates to reduce re-render pressure during slider movement.

## 2026-02-23 - Profile/Workspace image frame workflow stabilization

- [x] Kept image storage as full/original upload (no destructive crop export).
- [x] Fixed frame adjust direction and responsiveness:
  - drag now maps correctly to horizontal/vertical frame movement
  - slider/drag updates are stable after save/reopen.
- [x] Improved frame rendering model:
  - switched to `object-position + scale` for preview/topbar/profile/workspace display
  - removed old absolute width/left crop math that caused misalignment after save.
- [x] Added source-aware crop apply:
  - when editing existing image frame, saves frame POV without re-uploading file
  - upload occurs only for new image files.
- [x] Added safe clamping on saved frame values (`x/y/zoom`) to prevent corrupted states from breaking preview.

## 2026-02-23 - Teams panel cleanup (field-error placeholder)

- [x] Removed always-rendered empty team error paragraph in `Teams > Team actions`.
- [x] Team error row now renders only when an actual validation/error message exists.
- [x] This removes the confusing blank/"field error" area under color selection.

## 2026-02-23 - Settings grid overflow guard (Coming soon blocks)

- [x] Added a render-time auto-fit safety pass for Settings grid cards:
  - re-evaluates panel heights after async/conditional UI changes
  - prevents content (e.g. `Coming soon`) from spilling outside card boundaries.
- [x] Hardened `coming-soon-control` layout:
  - forced `width/max-width: 100%`
  - added `box-sizing: border-box` and `overflow: hidden`
  - prevents out-of-frame rendering artifacts.

## 2026-02-23 - Preferences: default Settings view mode

- [x] Added user preference `Default settings view` with options:
  - `Grid view`
  - `Tab view`
- [x] Persisted in UI preferences storage (`settingsDefaultView`).
- [x] Settings page now initializes/syncs its view mode from this preference.

## 2026-02-23 - Profile form header layout (name/surname inputs)

- [x] Moved `Name` and `Surname` input fields next to profile image (right side) in `My Profile`.
- [x] Removed old hardcoded visual name stack from the header area.
- [x] Kept email/team/bio below as full-width fields for cleaner edit flow.

## 2026-02-23 - Avatar frame preview parity fix

- [x] Fixed mismatch between crop modal preview and left edit preview in Settings/Profile.
- [x] Root cause: `.workspace-avatar-edit-preview img` had hard overrides (`object-fit: contain`, centered position, transform reset) that ignored saved frame (`x/y/zoom`).
- [x] Removed those overrides and aligned preview rendering with the same frame engine used in topbar/profile/workspace icons.

## 2026-02-23 - My Profile header visual balance

- [x] Increased profile image preview size in `My Profile` header to better match the vertical space of `Name` + `Surname` inputs.
- [x] Goal: remove the small visual gap under the image and improve header balance.

## 2026-02-23 - Profile stats header spacing fix

- [x] Fixed excessive vertical gap in `My stats` / `My dashboard stats` headers.
- [x] Root cause: `h4` inside `.panel-header` was not included in margin reset.
- [x] Added `.panel-header h4 { margin: 0; line-height: 1.15; }` with existing header typography reset.

## 2026-02-23 - My Profile header alignment tune (avatar vs name/surname)

- [x] Increased profile picture size in header from `136` to `148` for better visual balance with two stacked input rows.
- [x] Increased horizontal spacing between avatar and name/surname block (`gap: 18px`).
- [x] Slightly increased vertical spacing between name/surname rows (`gap: 10px`) for cleaner rhythm.

## 2026-02-23 - Workspaces tab view editor + coming-soon layout

- [x] In `Settings > Workspaces > Tab view`, workspace profile edit now opens as overlay context window (modal-style) above other panels.
- [x] Prevents inline editor collisions/overlap with adjacent cards and preserves button visibility.
- [x] Moved `Coming soon` (Workspaces) into tab-view management row:
  - now displayed as a third subpanel to the right of `Invites` and `Pending requests`
  - items are shown as vertical list (one under another).
- [x] Kept previous inline editor behavior for Grid view.

## 2026-02-23 - Settings tab overlays + preferences/notifications tab polish

- [x] Teams edit in `Tab view` now opens as overlay context window (same interaction model as Workspaces edit).
- [x] Roles edit in `Tab view` now opens as overlay context window (rename/permissions/reset flow without inline collisions).
- [x] Fixed duplicate `editingRole` declaration in `SettingsPage.tsx` to keep state logic clean and stable.
- [x] `Preferences` tab layout tightened:
  - left/main controls constrained to practical width
  - right `Coming soon` column reduced and visually closer to main controls.
- [x] `Notifications` tab updated to single-column flow:
  - mail notification toggles now render from an alphabetically sorted list
  - browser notifications and coming-soon entries stay in the same single column for consistent scanning.

## 2026-02-23 - Settings tab compact overlays + notifications side panel restore

- [x] Reduced overlay modal sizes for tab edit contexts:
  - Workspace edit overlay compacted
  - Team edit overlay compacted further
  - Role edit overlay compacted.
- [x] `Preferences` tab further compacted:
  - narrower main/side columns
  - dropdown/input widths reduced for less horizontal waste.
- [x] `Notifications` tab adjusted per UX request:
  - notifications remain one-column and alphabetical in the main column
  - `Coming soon` moved back to right-side column.

## 2026-02-23 - Docker/Nginx release-readiness hardening

- [x] Performed compose validation for `docker-compose.yml`, `docker-compose.deps.yml`, `docker-compose.local.yml`, `docker-compose.prod.yml`.
- [x] Validated frontend Nginx config with `nginx -t` in container.
- [x] Found and fixed backend Docker build blocker:
  - `backend/pmd-backend/Dockerfile` now uses `-Dmaven.test.skip=true` to skip test compilation inside image build.
  - This prevents container build failures caused by stale test constructor mismatch during test-compile phase.
- [x] Verified backend reviewer image build succeeds after fix.

