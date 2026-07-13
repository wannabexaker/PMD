#!/bin/sh
set -eu

if [ -z "${PMD_MONGO_APP_DB:-}" ] || [ -z "${PMD_MONGO_APP_USER:-}" ] || [ -z "${PMD_MONGO_APP_PASSWORD:-}" ]; then
  echo "PMD_MONGO_APP_DB / PMD_MONGO_APP_USER / PMD_MONGO_APP_PASSWORD must be set"
  exit 1
fi

# mongosh ships with Mongo 5.0+; the legacy `mongo` shell ships with 4.4 (needed
# on ARMv8.0-A hosts like the Raspberry Pi 4). Use whichever is present.
MONGO_SHELL=mongosh
command -v mongosh >/dev/null 2>&1 || MONGO_SHELL=mongo

"$MONGO_SHELL" --quiet --username "${MONGO_INITDB_ROOT_USERNAME}" --password "${MONGO_INITDB_ROOT_PASSWORD}" --authenticationDatabase admin <<EOF
use ${PMD_MONGO_APP_DB}
db.createUser({
  user: "${PMD_MONGO_APP_USER}",
  pwd: "${PMD_MONGO_APP_PASSWORD}",
  roles: [{ role: "readWrite", db: "${PMD_MONGO_APP_DB}" }]
})
EOF

echo "PMD Mongo app user initialized for database '${PMD_MONGO_APP_DB}'."
