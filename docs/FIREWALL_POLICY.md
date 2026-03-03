# PMD Host Firewall Policy (Production)

Target LAN: `10.150.11.0/24`

Policy:

- Allow inbound `80/tcp` and `443/tcp` only from corporate LAN.
- Deny inbound app-internal ports from all sources:
  - `8080/tcp` (backend)
  - `27017/tcp` (mongodb)
- Keep Windows inbound default policy as `Block` (recommended). The script intentionally avoids broad block rules on `80/443` to prevent block-rule precedence from overriding LAN allow rules.

## Windows (PowerShell / netsh)

Apply:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\firewall\pmd-firewall-windows.ps1 -Mode apply -LanCidr 10.150.11.0/24
```

Rollback:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\firewall\pmd-firewall-windows.ps1 -Mode rollback
```

Status:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\firewall\pmd-firewall-windows.ps1 -Mode status
```
