#!/usr/bin/env bash
# Start, stop and inspect the PMD demo on the Pi — always through compose.
#
# Use this instead of `docker start pmd-…`: a bare `docker start` revives whatever container
# already exists, even one created from an older compose file or image. `up` here always
# recreates from docker-compose.pi.yml and the image tag pinned in .env (PMD_BACKEND_TAG).
#
#   ./scripts/pi/demo.sh up       pull the pinned image, (re)create, wait for health
#   ./scripts/pi/demo.sh down     stop and remove the containers (volumes are kept)
#   ./scripts/pi/demo.sh status   container state, memory, health endpoint
#   ./scripts/pi/demo.sh logs     follow the backend log
#
# Run from anywhere; it works in the folder that holds docker-compose.pi.yml and .env.
set -euo pipefail

cd "$(dirname "$0")/../.."
compose=(docker compose -f docker-compose.pi.yml)

if [ ! -f .env ]; then
  echo "No .env next to docker-compose.pi.yml (see docs/OPERATIONS.md)." >&2
  exit 1
fi

health() {
  curl -fsS --max-time 5 http://127.0.0.1:8080/actuator/health 2>/dev/null || echo "(no answer)"
}

case "${1:-status}" in
  up)
    "${compose[@]}" pull
    "${compose[@]}" up -d --remove-orphans
    echo -n "Waiting for the backend"
    for _ in $(seq 1 60); do
      if curl -fsS --max-time 3 http://127.0.0.1:8080/actuator/health >/dev/null 2>&1; then
        echo " — up."
        health; echo
        exit 0
      fi
      echo -n "."
      sleep 5
    done
    echo " — not healthy after 5 minutes. Last log lines:" >&2
    "${compose[@]}" logs --tail 40 backend >&2
    exit 1
    ;;
  down)
    "${compose[@]}" down
    ;;
  status)
    "${compose[@]}" ps
    docker stats --no-stream --format '{{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}' pmd-backend-1 pmd-mongo-1 2>/dev/null || true
    echo -n "health: "; health; echo
    ;;
  logs)
    "${compose[@]}" logs -f --tail 100 backend
    ;;
  *)
    echo "usage: $0 up|down|status|logs" >&2
    exit 2
    ;;
esac
