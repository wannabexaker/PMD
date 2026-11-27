# PMD operations on the Pi

Day-to-day runbook for the Raspberry Pi that hosts the PMD API. The Pi is shared by all of the
owner's projects: nothing here reboots it, restarts the Docker daemon, or touches another
project's containers, volumes, networks or ports.

## Layout

| | |
| --- | --- |
| Folder | `~/projects/pmd` (next to the other projects) |
| Files | `docker-compose.pi.yml`, `.env` (chmod 600), `scripts/mongo/`, `scripts/pi/` |
| Secrets | `.env`, loaded by compose automatically. Template: `.env.pi.example` |
| Image | `ghcr.io/wannabexaker/pmd-backend:${PMD_BACKEND_TAG}`, pinned in `.env` |
| Data | volumes `pmd_mongo_data`, `pmd_uploads` (the compose file pins `name: pmd`) |
| Limits | backend 640 MB / 1 CPU, mongo 512 MB / 1 CPU, logs 3 × 10 MB per container |

The older layout (`~/pmd` with `.env.production` and `--env-file`) gave the same project name,
so moving between the two keeps the same containers' names and the same volumes.

## Starting, stopping, checking

Always through `scripts/pi/demo.sh`, never a bare `docker start`: that revives whatever
container exists, even one created from an older compose file or image.

```bash
cd ~/projects/pmd
./scripts/pi/demo.sh up       # pull the pinned image, recreate, wait for /actuator/health
./scripts/pi/demo.sh status   # state, memory, health
./scripts/pi/demo.sh logs     # follow the backend log
./scripts/pi/demo.sh down     # stop and remove the containers; volumes stay
```

The frontend shows "demo — backend offline" by itself whenever the health check fails.

## Updating to a new backend build

Every push to `main` builds `pmd-backend:<commit sha>` (Release workflow). On the Pi, set
`PMD_BACKEND_TAG=<sha>` in `.env`, then `./scripts/pi/demo.sh up`. Rolling back is the same
with the previous sha.

## Moving from `~/pmd` to `~/projects/pmd` (one-off)

```bash
# 0. One-off dump of the current data first (unless the owner says skip).
docker start pmd-mongo-1            # only if it is stopped; the old backend stays down
docker exec pmd-mongo-1 sh -c 'mongodump --quiet -u "$MONGO_INITDB_ROOT_USERNAME" \
  -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db pmd --archive --gzip' \
  > ~/pmd/pmd-db-premove-$(date +%Y%m%d).archive.gz

# 1. Deploy files from this repo
mkdir -p ~/projects/pmd/scripts
#    copy docker-compose.pi.yml, scripts/mongo/, scripts/pi/

# 2. Secrets: one .env, owner-only. Copy, do not move: ~/pmd stays as the fallback.
cp -p ~/pmd/.env.production ~/projects/pmd/.env && chmod 600 ~/projects/pmd/.env

# 3. Variables the repo's compose file needs that the old file lacked:
#    PMD_SECURITY_ADMIN_EMAILS, PMD_BACKEND_TAG, JAVA_OPTS=-XX:MaxRAMPercentage=60.
#    The old CLOUDFLARE_TUNNEL_TOKEN line is unused and can go.

# 4. Check it resolves without printing it (the merged config contains secrets):
docker compose -f docker-compose.pi.yml config --quiet && echo OK

# 5. Replace the old containers (volumes are kept) and start:
docker rm -f pmd-backend-1 pmd-mongo-1
./scripts/pi/demo.sh up
```

After the move works, `~/pmd` can be archived. Keep `.env.production` and the dump until then.

## Backups (prepared, not scheduled)

`scripts/pi/backup.sh` dumps the `pmd` database (mongodump, gzip archive, through the mongo
container so credentials never leave it) and tars the uploads, with sha256 checksums. It keeps
14 daily and 6 monthly copies. It never starts a container: with mongo stopped it exits 1.
Tested against a throwaway `mongo:4.4.18`: dump, checksum, and `mongorestore` all round-trip.

**Not used, on purpose.** PMD is a demo: demo workspaces expire after 7 days, nothing in it is
worth restoring, and the Terms and Privacy Policy say there are no backups. The script is kept to
show the setup is ready. If PMD ever stops being a demo, two things come first:

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
