# PMD operations on the Pi

Day-to-day runbook for the Raspberry Pi that hosts the PMD API. The Pi is shared by all of the
owner's projects: nothing here reboots it or restarts the Docker daemon.

**Current state (2026-11-21):** the demo backend is stopped on purpose. `pmd-backend-1` and
`pmd-mongo-1` exist but are exited. Do not start them unless the owner asks.

## Layout

| | Today | Target |
| --- | --- | --- |
| Folder | `~/pmd` | `~/projects/pmd` (next to the other projects) |
| Secrets | `~/pmd/.env.production`, passed with `--env-file` | `~/projects/pmd/.env`, loaded by compose automatically |
| Compose file | an older copy of `docker-compose.pi.yml` | this repo's `docker-compose.pi.yml` |

Both layouts give the same compose project name (`pmd`), so container names (`pmd-*`) and data
volumes (`pmd_mongo_data`, `pmd_uploads`) do not change. The repo's file pins it with `name: pmd`;
the old one gets it from the folder name `pmd`.

## Moving to `~/projects/pmd` (prepared — owner's decision)

Copying files touches no container. The last step (`up -d`) recreates the containers from the
new file, so it waits for the owner — and while the demo is off there is no reason to run it.

```bash
# 1. New folder with the deploy files from this repo
mkdir -p ~/projects/pmd/scripts
cd ~/projects/pmd
#    copy from a checkout or the dev machine (scp):
#      docker-compose.pi.yml
#      scripts/mongo/        (mongo init script, mounted by the compose file)
#      scripts/pi/           (admin-mode.sh, backup.sh)

# 2. Secrets: one .env, owner-only. Copy, do not move — ~/pmd stays as the fallback.
cp -p ~/pmd/.env.production ~/projects/pmd/.env
chmod 600 ~/projects/pmd/.env

# 3. The repo's compose file requires PMD_SECURITY_ADMIN_EMAILS, which the old env file
#    does not have. Add it (the same address admin-mode.sh uses):
grep -q '^PMD_SECURITY_ADMIN_EMAILS=' .env || echo 'PMD_SECURITY_ADMIN_EMAILS=<admin email>' >> .env
#    The old CLOUDFLARE_TUNNEL_TOKEN line, if present, is unused now and can be deleted.

# 4. Check it resolves. Prints the merged config (contains secrets) — so only look at the
#    exit code and the names:
docker compose -f docker-compose.pi.yml config --quiet && echo OK
docker compose -f docker-compose.pi.yml config --services     # mongo, backend
docker compose -f docker-compose.pi.yml config --volumes      # mongo_data, uploads

# 5. ONLY when the owner says so (recreates pmd-mongo-1 and pmd-backend-1, keeps volumes):
#    docker compose -f docker-compose.pi.yml up -d
#    curl -fsS http://127.0.0.1:8080/actuator/health
```

After the move works, `~/pmd` can be archived. Keep `.env.production` until then.

What `up -d` would change compared to the old copy: the stack no longer has a `cloudflared`
service (the host-level tunnel serves `api-pmd.olamov.com`), and the backend gets the admin
allowlist, which strips the admin flag from any other account at startup.

## Starting / stopping the demo (owner only)

```bash
docker start pmd-mongo-1 pmd-backend-1      # start
curl -fsS http://127.0.0.1:8080/actuator/health
docker stop pmd-backend-1 pmd-mongo-1       # stop
```

The frontend shows "demo — backend offline" by itself whenever the health check fails.

## Backups (prepared, not scheduled)

`scripts/pi/backup.sh` dumps the `pmd` database (mongodump, gzip archive, through the mongo
container so credentials never leave it) and tars the uploads, with sha256 checksums. It keeps
14 daily and 6 monthly copies. It never starts a container: with mongo stopped it exits 1.
Tested against a throwaway `mongo:4.4.18`: dump, checksum, and `mongorestore` all round-trip.

**Blocked on two things before it may run:**

1. **Legal docs.** The Terms (§4, §8) and the Privacy Policy say there are no backups.
   `docs/legal/README.md` (R3) requires privacy §12/§13/§14.2 and terms §8 to be rewritten —
   retention of backup copies, erasure propagating to backups — **before the first dump**.
2. **Target.** `BACKUP_ROOT` defaults to `/mnt/backup/pmd`. A copy on the same SD card does not
   survive the card failing; an external drive or another host is the point.

To schedule it (owner): `crontab -e` and add

```
15 3 * * *  $HOME/projects/pmd/scripts/pi/backup.sh >> $HOME/projects/pmd/backup.log 2>&1
```

Restore, into the running mongo container:

```bash
sha256sum -c pmd-<stamp>.sha256
docker stop pmd-backend-1
docker exec -i pmd-mongo-1 sh -c 'mongorestore -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --drop --archive --gzip' < pmd-db-<stamp>.archive.gz
gunzip -c pmd-uploads-<stamp>.tar.gz | docker cp - pmd-backend-1:/app/
docker start pmd-backend-1
```

## Platform admin

`scripts/pi/admin-mode.sh on|off|status` — flips the admin flag for the one allowed account,
on demand. Needs mongo running.
