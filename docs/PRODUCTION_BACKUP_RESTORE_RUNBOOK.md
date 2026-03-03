# PMD MongoDB Backup / Restore Runbook

## Scope

- Database: `pmd` (MongoDB)
- Frequency: daily full backup
- Retention: 14 daily, 8 weekly, 6 monthly
- Targets:
  - RPO: <= 24h
  - RTO: <= 60 min (single-node restore baseline)

## 1) Backup Procedure (daily)

1. Create timestamped archive:
   - `mongodump --uri "$SPRING_DATA_MONGODB_URI" --archive="backup-pmd-YYYYMMDD-HHMM.gz" --gzip`
2. Generate checksum:
   - `sha256sum backup-pmd-YYYYMMDD-HHMM.gz > backup-pmd-YYYYMMDD-HHMM.gz.sha256`
3. Store to secure backup location (off-host preferred).
4. Rotate old backups by retention policy.

## 2) Restore Procedure (test/prod incident)

1. Validate checksum:
   - `sha256sum -c backup-file.sha256`
2. Stop PMD backend (avoid writes during restore).
3. Restore:
   - `mongorestore --uri "$SPRING_DATA_MONGODB_URI" --drop --archive="backup-file.gz" --gzip`
4. Start backend.
5. Run post-restore checks:
   - login works,
   - workspace list loads,
   - projects/teams/roles visible,
   - `/actuator/health` is `UP`.

## 3) Monthly Restore Drill (mandatory)

- Restore latest backup into isolated staging DB.
- Execute smoke tests (auth + workspace + assign + notifications).
- Record result, elapsed time, and issues.

## 4) Verification Checklist

- [ ] Backup file exists and size is non-trivial.
- [ ] SHA-256 checksum matches.
- [ ] Restore completes without errors.
- [ ] Critical flows pass after restore.
- [ ] Retention cleanup executed.

## 5) Security Notes

- Never commit backups to git.
- Encrypt backups at rest (storage policy/KMS).
- Limit backup access to ops/admin roles only.
