# PMD DB Runbook (Mongo)

## Backup

```powershell
./scripts/db_backup.ps1 -ContainerName pmd-mongo -Database pmd
```

Default output: `.runtime/db-backups/<db>-<timestamp>/<db>`

## Restore

```powershell
./scripts/db_restore.ps1 -ContainerName pmd-mongo -Database pmd -BackupFolder ".runtime/db-backups/pmd-YYYYMMDD-HHMMSS"
```

`restore` uses `--drop` for a clean DB restore.

## LTS guardrails

- Keep at least one daily backup and one weekly backup.
- Test restore in a non-production environment at least monthly.
- Apply schema/index changes through migration runner only.
- Monitor collections with TTL:
  - `auth_sessions` (expiresAt)
  - `auth_security_events` (180 days)
