# Security Policy

## Supported Versions

PMD is under active development. Security fixes are applied to the `main` branch.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately — do **not** open a public issue
for a security problem.

- Preferred: open a [GitHub private security advisory](https://github.com/wannabexaker/PMD/security/advisories/new).
- Alternatively, email the maintainer with the details.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (proof of concept if possible).
- Affected component (backend / frontend / infra) and any relevant configuration.

You can expect an initial acknowledgement within a few business days. Please give
us reasonable time to investigate and ship a fix before any public disclosure.

## Scope & Hardening Notes

PMD already applies a number of controls; the following are the most relevant when
assessing a report:

- **Auth:** short-lived JWT access tokens held in memory + rotating refresh session
  in an HttpOnly cookie, CSRF double-submit on cookie endpoints, per-IP/per-user rate
  limiting, optional email verification.
- **Uploads:** restricted to real JPEG/PNG/WEBP content (validated by magic bytes,
  not the client Content-Type/filename) and stored under server-generated names.
- **Transport / headers:** CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
  Referrer-Policy and related headers are set (backend + Nginx).
- **Network:** production compose keeps MongoDB and the backend on internal-only
  Docker networks; only the frontend is published.

When in doubt, assume a finding is in scope and report it.
