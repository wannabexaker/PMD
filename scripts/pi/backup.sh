#!/usr/bin/env bash
# Back up PMD's MongoDB database and uploads on the Pi. PREPARED, NOT SCHEDULED.
#
# Before the first run (see docs/OPERATIONS.md, "Backups"):
#   1. The Terms and Privacy Policy say there are no backups. They must be rewritten
#      first (docs/legal/README.md, R3) — a dump taken before that contradicts them.
#   2. BACKUP_ROOT should be off the SD card (external drive or another host).
#
# What it does, each run:
#   - mongodump of the pmd database, through the running mongo container (credentials
#     stay inside it: the shell there reads its own environment), gzip archive;
#   - tar of the uploads directory, copied out of the backend container (works even
#     when the backend is stopped);
#   - sha256 checksums; on the 1st of the month a copy goes to monthly/;
#   - prunes daily/ after KEEP_DAILY days and monthly/ after KEEP_MONTHS months.
#
# It never starts or stops a container. If mongo is not running it exits non-zero.
#
# Cron line (NOT installed — the owner decides):
#   15 3 * * *  /home/<user>/projects/pmd/scripts/pi/backup.sh >> /home/<user>/projects/pmd/backup.log 2>&1
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/mnt/backup/pmd}"
MONGO_CONTAINER="${MONGO_CONTAINER:-pmd-mongo-1}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-pmd-backend-1}"
DB_NAME="${DB_NAME:-pmd}"
KEEP_DAILY="${KEEP_DAILY:-14}"
KEEP_MONTHS="${KEEP_MONTHS:-6}"

stamp="$(date +%Y%m%d-%H%M)"
daily="$BACKUP_ROOT/daily"
monthly="$BACKUP_ROOT/monthly"

log() { echo "$(date '+%F %T') backup: $*"; }

running="$(docker inspect -f '{{.State.Running}}' "$MONGO_CONTAINER" 2>/dev/null || echo missing)"
if [ "$running" != "true" ]; then
  log "$MONGO_CONTAINER is not running ($running); nothing dumped. Not starting it."
  exit 1
fi

umask 077
mkdir -p "$daily" "$monthly"

db_file="$daily/pmd-db-$stamp.archive.gz"
up_file="$daily/pmd-uploads-$stamp.tar.gz"

# Write to a .part file first so a failed dump never looks like a finished backup.
docker exec "$MONGO_CONTAINER" sh -c \
  'mongodump --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db "$1" --archive --gzip' \
  _ "$DB_NAME" > "$db_file.part"
mv "$db_file.part" "$db_file"
log "db -> $db_file ($(du -h "$db_file" | cut -f1))"

if docker inspect "$BACKEND_CONTAINER" >/dev/null 2>&1; then
  docker cp "$BACKEND_CONTAINER:/app/uploads" - | gzip > "$up_file.part"
  mv "$up_file.part" "$up_file"
  log "uploads -> $up_file ($(du -h "$up_file" | cut -f1))"
else
  log "$BACKEND_CONTAINER not found; uploads skipped"
  up_file=""
fi

( cd "$daily" && sha256sum "$(basename "$db_file")" ${up_file:+"$(basename "$up_file")"} > "pmd-$stamp.sha256" )

if [ "$(date +%d)" = "01" ]; then
  cp -p "$db_file" "$daily/pmd-$stamp.sha256" ${up_file:+"$up_file"} "$monthly/"
  log "monthly copy kept"
fi

find "$daily" -type f -mtime +"$KEEP_DAILY" -delete
find "$monthly" -type f -mtime +"$((KEEP_MONTHS * 31))" -delete
log "done"
