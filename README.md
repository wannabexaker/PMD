# PMD CI/CD

This repo includes GitHub Actions workflows, Dockerfiles, and a production compose file.

## GitHub Actions

- CI workflow runs on PRs and pushes to `main`.
- Release workflow builds and pushes Docker images to GHCR on `main` and supports manual deploy via SSH.

### Required GitHub Secrets

Create these in the repo settings (values not included here):

- `GHCR_PAT` (optional if `GITHUB_TOKEN` has package write access)
- `SSH_HOST` (for deploy job)
- `SSH_USER` (for deploy job)
- `SSH_KEY` (for deploy job, private key)
- `SSH_PORT` (optional, defaults to 22)

## Docker Images

Images pushed to GHCR:

- `ghcr.io/<owner>/pmd-frontend:latest` and `:sha`
- `ghcr.io/<owner>/pmd-backend:latest` and `:sha`

## Production Compose

`docker-compose.prod.yml` expects these environment variables (use a `.env` file on the server):

- `GHCR_OWNER` (GitHub org/user name for image pulls)
- `SPRING_DATA_MONGODB_URI` (defaults to `mongodb://mongo:27017/pmd`)
- `PMD_JWT_SECRET` (required)
- `PMD_JWT_EXPIRATIONSECONDS` (default `86400`)
- `PMD_MAIL_FROM` (default `no-reply@pmd.local`)
- `SPRING_MAIL_HOST` (default `localhost`)
- `SPRING_MAIL_PORT` (default `1025`)

Example `.env`:

```
GHCR_OWNER=your-org
PMD_JWT_SECRET=change-me
```

## Manual Deploy (workflow_dispatch)

The release workflow has a manual `deploy` option:

- It SSHes to the host and runs:
  - `docker compose -f docker-compose.prod.yml pull`
  - `docker compose -f docker-compose.prod.yml up -d`

Ensure the remote path contains `docker-compose.prod.yml` (default `/opt/pmd`).
