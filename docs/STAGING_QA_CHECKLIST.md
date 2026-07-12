# Staging QA Checklist

Functional QA pass for a staging deploy. Complements `PRODUCTION_RELEASE_CHECKLIST.md`
(release/ops) — this file is about **verifying the app behaves correctly** in a
production-like environment.

Scope note: the areas below were verified in **dev** (local profile, MailHog,
single instance) during development. Re-run them in **staging** because several
behaviours only differ under production config: HTTPS/Secure cookies,
`SameSite=Strict`, real SMTP, strict CORS origins, `trust-proxy-headers` behind
Nginx, and any multi-instance setup.

Legend: ☐ = to verify · **[P]** = production-config-specific (couldn't be tested
in dev) · **[R]** = regression check for a bug fixed in this release.

---

## 0. Environment / pre-flight **[P]**
- ☐ All six+ required prod env vars set; `docker-compose.prod.yml` starts (fails
  fast if any are missing).
- ☐ `PMD_APP_BASE_URL` = the real staging origin (used in email links).
- ☐ `PMD_ALLOWED_ORIGINS` = exact staging origin(s); no `localhost`/wildcards.
- ☐ `scripts/verify-prod-surface.ps1` passes — Mongo and backend ports are **not**
  bound to the host; only the frontend is published.
- ☐ MailHog is **not** in the default profile (debug-only).
- ☐ `PMD_SEED_DEMO` is unset/false (no demo users/passwords in staging).
- ☐ TLS terminates in front of Nginx; app reached over **https://**.

## 1. Smoke
- ☐ `GET /actuator/health` → 200 `UP` (Mongo reachable).
- ☐ Frontend loads; no console errors on first paint.
- ☐ Register a fresh user → receives **Confirm your PMD account** email.
- ☐ Log in → lands on Dashboard.

## 2. Auth, sessions & CSRF **[P]**
- ☐ Refresh cookie `PMD_RT` is set with **Secure** + **HttpOnly** + **SameSite=Strict**
  (check DevTools → Application → Cookies over https).
- ☐ `PMD_CSRF` cookie present (readable) for the double-submit header.
- ☐ Reload the page (F5) → stays logged in (refresh via cookie works).
- ☐ Leave a tab idle past the 15-min access-token lifetime, then act → silent
  refresh, no forced logout.
- ☐ `POST /api/auth/logout` → logged out; refresh no longer works.
- ☐ `logout-all` revokes other sessions.
- ☐ Invalid login → 401 (generic message, no user enumeration).
- ☐ Rapid failed logins from one IP eventually rate-limited (429) — then recover.

## 3. Core flows — click through in the UI
(These were largely covered at the API level in dev; click them in staging.)
- ☐ **Create project** with a team, with members, and **without a team [R]**
  (a user not in a team must be able to create — this was a 400 bug).
- ☐ Change status through every transition: NOT_STARTED → IN_PROGRESS →
  COMPLETED → CANCELED → back to IN_PROGRESS.
- ☐ Archive a project, then restore it.
- ☐ Assign / reassign / drop members; **Assign page** drag + Save.
- ☐ Random-assign a project.
- ☐ Delete a project.
- ☐ **Comments**: post, reply as a second user, add/remove reactions.
- ☐ **Attachments**: attach an image to a comment; it persists on reload.
- ☐ **@mentions**: mention a user → they get an email + in-app notification.
- ☐ **Dashboard** charts + workspace summary numbers are internally consistent.

## 4. Workspaces, teams, roles, invites
- ☐ Create a workspace; switch workspaces (picker) rapidly — no broken state.
- ☐ Create/rename team; soft-delete (isActive:false) a team.
- ☐ Create a custom role, edit its permissions, assign to a member.
- ☐ **Invite → join**: owner creates an invite → new user registers → joins via
  the token → sees the workspace.
- ☐ **Join request** (workspace with approval on): request → owner approves/denies
  → approver + requester get emails.
- ☐ Non-owner/member is correctly **denied** owner-only actions.
- ☐ **Workspace delete** is a *scheduled* flow: preview → wrong confirm-name is
  rejected → correct name schedules it → **cancel** restores it.

## 5. Admin panel **[R]**
- ☐ Log in as a **platform admin** (`isAdmin` user).
- ☐ The **Admin Panel** nav link appears and `/admin` renders (this was broken —
  admin flag serialized as `admin` vs frontend `isAdmin`).
- ☐ Admin overview / workspaces / users (+ search) / audit all load.
- ☐ A **non-admin** gets 403 on `/api/admin/*` and never sees the nav link.
- ☐ People management (create/edit/delete person) is visible/usable **only** to admins.

## 6. Profile & people
- ☐ Update name / bio / team → persists.
- ☐ Avatar upload (crop) → shows on profile and in lists.
- ☐ **[R]** Avatar URL with `javascript:`/`data:` scheme is rejected (400).
- ☐ Recommendations: recommend a colleague, see them in the recommended list;
  self-recommend is blocked (409).

## 7. Uploads & security **[R]**
- ☐ Upload a valid JPEG/PNG/WEBP → 201.
- ☐ Upload an **SVG or HTML renamed to .png** (spoofed Content-Type) → **400**
  (magic-byte validation; stored-XSS guard).
- ☐ Uploaded files are served from `/uploads/**`; a missing file → **404** (not 500) **[R]**.
- ☐ Response headers present (backend + Nginx): CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, Referrer-Policy.
- ☐ Rate-limit headers present (`X-RateLimit-*`) on API responses.

## 8. Error contract **[R]**
- ☐ Invalid enum (bad project status / reaction type) → **400** (not 500).
- ☐ Unsupported method on an endpoint → **405** (not 500).
- ☐ Missing route/resource → **404** (not 500).
- ☐ Error bodies carry `code`, `message`, `requestId` and do **not** leak stack traces.

## 9. Email (real SMTP) **[P]**
- ☐ Confirm-account, assignment, status-change, mention, join-request emails
  actually arrive (real mailbox, not MailHog).
- ☐ Links in emails point to `PMD_APP_BASE_URL` (the staging origin), not localhost.
- ☐ Digest/throttled emails behave per user notification preferences.

## 10. Concurrency & infra
- ☐ Two users editing the same project concurrently → last-write-wins, no 500/corruption.
- ☐ **[P]** If running multiple backend instances: rate-limiting is per-instance
  (in-memory) — confirm this is acceptable, or front it with a shared limiter.
- ☐ **[P]** `PMD_SECURITY_TRUST_PROXY_HEADERS=true` is safe only because the
  backend is unexposed behind Nginx — verify the network topology still holds.
- ☐ DB backup/restore runbook works against staging data.

## 11. Rollback readiness
- ☐ Previous image tag known; rollback tested (compose uses SHA tags).
- ☐ Mongo migration is backward-safe or has a documented rollback.

---

### Known limitations / follow-ups (not blockers)
- Rate limiting is in-memory (single-instance). Add Redis/bucket4j before scaling out.
- Refresh-token rotation is lenient (no strict reuse-detection) — acceptable, but
  a hardening opportunity.
- Deeper automated coverage (Testcontainers IDOR/auth suite, Playwright e2e) would
  reduce reliance on manual passes like this one.
