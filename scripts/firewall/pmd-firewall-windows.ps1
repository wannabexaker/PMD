Param(
  [ValidateSet("apply", "rollback", "status")]
  [string]$Mode = "status",
  [string]$LanCidr = "10.150.11.0/24"
)

$ErrorActionPreference = "Stop"

function Ensure-Admin {
  $current = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
  if (-not $current.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this script as Administrator."
  }
}

function Apply-Rules {
  Ensure-Admin
  # Remove existing PMD rules first to keep apply idempotent.
  Rollback-Rules
  netsh advfirewall firewall add rule name="PMD Allow 80 from LAN" dir=in action=allow protocol=TCP localport=80 remoteip=$LanCidr
  netsh advfirewall firewall add rule name="PMD Allow 443 from LAN" dir=in action=allow protocol=TCP localport=443 remoteip=$LanCidr
  netsh advfirewall firewall add rule name="PMD Deny backend 8080 inbound" dir=in action=block protocol=TCP localport=8080 remoteip=any
  netsh advfirewall firewall add rule name="PMD Deny mongo 27017 inbound" dir=in action=block protocol=TCP localport=27017 remoteip=any
}

function Rollback-Rules {
  Ensure-Admin
  netsh advfirewall firewall delete rule name="PMD Allow 80 from LAN"
  netsh advfirewall firewall delete rule name="PMD Allow 443 from LAN"
  netsh advfirewall firewall delete rule name="PMD Deny backend 8080 inbound"
  netsh advfirewall firewall delete rule name="PMD Deny mongo 27017 inbound"
}

function Show-Status {
  netsh advfirewall firewall show rule name=all | Select-String "PMD "
}

switch ($Mode) {
  "apply" { Apply-Rules }
  "rollback" { Rollback-Rules }
  default { Show-Status }
}
