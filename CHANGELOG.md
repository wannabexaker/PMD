# Changelog

Notable changes to PMD. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are git tags (`v0.1.x`); the backend and frontend images on GHCR are rebuilt from
`main` on every push.

## [Unreleased]

Everything since `v0.1.9` (2026-04-29).

### Added
- Live deployment: frontend on Vercel (pmd.olamov.com), API on a Raspberry Pi 4 behind
  Cloudflare (api-pmd.olamov.com), multi-arch images.
- Google Sign-In and Cloudflare Turnstile on the auth screens.
- GDPR data export and account deletion; privacy notice and terms, with acceptance recorded
  on the server at registration.
- Platform-admin entry into workspaces is recorded; the admin flag survives startup only for
  allowlisted emails, toggled on demand with `scripts/pi/admin-mode.sh`.
- A "demo — backend offline" notice on the auth screens when the API does not answer, instead
  of a failed sign-in.
- `AGENTS.md` for AI sessions, `docs/OPERATIONS.md` for the Pi, and a prepared (not scheduled)
  backup script, `scripts/pi/backup.sh`.

### Changed
- The Pi stack (`docker-compose.pi.yml`) matches what runs on the Pi: backend on
  `127.0.0.1:8080` for the Pi's host-level tunnel, no `cloudflared` service of its own, one
  `.env`, and a fixed compose project name.
- Shared avatar crop dialog with a reworked UX; the crop is baked into the uploaded file.
- `pmd.bat` and `PMD_cooler.bat` moved to `scripts/`.
- Removed `docker-compose.yml`, a duplicate of `docker-compose.deps.yml` (same containers).

### Fixed
- Security: client-IP handling, a role privilege ceiling, confirmed email changes, CSP
  reconciled between Vercel and nginx, invite escalation closed, demo members cannot log in,
  production refuses to start with demo seeding or without required secrets.
- Audit log hash chain is actually tamper-evident.
- Privacy: salted IP fingerprints, avatars deleted on replacement and erasure, comment author
  names anonymised on erasure.
- Uploads: per-account rate limit; comment attachments off until a storage quota exists.
- API: duplicate keys return 409, identity indexes are created by migration.

## [0.1.9] - 2026-04-29

Earlier history is in the git log and the `v0.1.x` tags.
