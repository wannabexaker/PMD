# PMD Production Release Checklist

## A) Preflight Security Checks

- [ ] `docker compose -f docker-compose.prod.yml config` renders successfully.
- [ ] `scripts/verify-prod-surface.ps1` passes (no published `8080/27017`).
- [ ] `PMD_ALLOWED_ORIGINS` set to real domains (no wildcards).
- [ ] `PMD_JWT_SECRET`, Mongo and mail credentials are non-default secrets.
- [ ] `PMD_AUTH_REQUIRE_VERIFIED_EMAIL=true` for production.
- [ ] Mailhog is not enabled in production startup.

## B) Build / CI

- [ ] Frontend lint/build pass.
- [ ] Backend tests pass.
- [ ] Container images built and tagged.
- [ ] Vulnerability scan completed for images/dependencies.

## C) DB / Migration Checks

- [ ] Backup created before deploy.
- [ ] Migration scripts (if any) are idempotent and tested.
- [ ] Index checks completed.
- [ ] Restore plan validated.

## D) Deploy Smoke Tests

- [ ] `GET /` returns frontend.
- [ ] `GET /actuator/health` via proxy returns `UP`.
- [ ] Login/register/refresh/logout flow works.
- [ ] Workspace switch works.
- [ ] Core API endpoints reachable via `/api/*`.
- [ ] Upload route works.

## E) Auth / Security Validation

- [ ] Cookies are `HttpOnly` + `Secure` (prod) + expected `SameSite`.
- [ ] CORS accepts only expected origins.
- [ ] Rate limiting headers present.
- [ ] Forbidden routes return `403/401` as expected.

## F) Rollback Plan

- [ ] Previous image tags available.
- [ ] Previous compose + env artifacts archived.
- [ ] DB backup restore command tested.
- [ ] Rollback owner and execution steps documented.

## G) Post-Deploy Validation (first 24h)

- [ ] Error rate baseline monitored.
- [ ] Auth failures monitored.
- [ ] DB connectivity/latency monitored.
- [ ] Mail delivery monitored.
- [ ] No unauthorized port exposure detected.
