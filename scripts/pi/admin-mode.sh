#!/usr/bin/env bash
# Toggle platform-admin for the one allowed account, on demand.
#
# The account is a normal user by default; admin is switched on for the task that
# needs it and off again after. The email is hardcoded on purpose — it must match
# PMD_SECURITY_ADMIN_EMAILS in .env.production, and nobody else is ever promoted
# this way. Run on the Pi:   ./admin-mode.sh on|off|status
#
# Credentials never leave the mongo container: the shell inside it reads its own
# environment. After flipping, refresh the browser so the frontend re-reads the flag.
set -euo pipefail

EMAIL="dimos.is.dev@gmail.com"
CONTAINER="pmd-mongo-1"

mode="${1:-status}"

mongo_eval() {
  docker exec "$CONTAINER" sh -c 'mongo --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin pmd --eval "'"$1"'"'
}

case "$mode" in
  on|off)
    flag=$([ "$mode" = "on" ] && echo true || echo false)
    result=$(mongo_eval "db.users.updateOne({email: \\\"$EMAIL\\\"}, {\\\$set: {isAdmin: $flag}}).matchedCount")
    if [ "$result" = "0" ]; then
      echo "No account found for $EMAIL — sign in once first, then retry." >&2
      exit 1
    fi
    echo "admin=$flag for $EMAIL (refresh the browser to pick it up)"
    ;;
  status)
    mongo_eval "var u = db.users.findOne({email: \\\"$EMAIL\\\"}, {isAdmin: 1, email: 1}); print(u ? u.email + \\\" admin=\\\" + (u.isAdmin === true) : \\\"no account for $EMAIL\\\")"
    ;;
  *)
    echo "usage: $0 on|off|status" >&2
    exit 2
    ;;
esac
