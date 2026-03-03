# PMD Production Architecture (DevSecOps Audit + Target State)

## 1) Current-State Audit (as found in repo)

| Service | Port(s) | Public/Private | Risk | Recommended action |
|---|---:|---|---|---|
| Frontend nginx (`frontend`) | `80` | Public | Low | Keep as the only public entrypoint. Terminate TLS at this layer/load balancer. |
| Backend Spring Boot (`backend`) | `8080` | **Was public in prod compose** | High | Remove host publish; keep internal-only behind frontend reverse proxy. |
| MongoDB (`mongo`) | `27017` | Private in prod / public in dev compose | High (if public) | Never publish in production. Enable auth + least-privileged app user. |
| Mailhog (`mailhog`) | `1025`,`8025` | Dev/debug only | Medium | Exclude from production profile by default. |
| Actuator (`/actuator/health`) | Via frontend proxy | Controlled public route | Medium | Keep health-only exposure, add limits, do not expose sensitive endpoints. |
| Uploads (`/uploads`) | Via frontend proxy | Public route | Medium | Keep through proxy only, add baseline rate limit + strict headers. |

## 2) Target Production Architecture

Rule: **Public only reverse proxy (80/443). Backend and MongoDB internal.**

Text network diagram:

1. `edge` network (public ingress):
   - `frontend` attached.
   - host publishes only `80` (and optionally `443` when TLS is terminated in-container).
2. `app` network (internal):
   - `frontend` <-> `backend` communication only.
3. `data` network (internal):
   - `backend` <-> `mongo` communication only.
4. `mailhog` runs only in `debug` profile and is not part of default production startup.

Data flow:

- Client -> `frontend:80/443`
- `frontend` -> `backend:8080` for `/api`, `/actuator`, `/uploads`
- `backend` -> `mongo:27017` with authenticated app user

## 3) Migration Plan (no downtime)

1. Deploy new compose with `frontend` still public and `backend` also temporarily reachable (legacy phase).
2. Validate internal proxy routing (`/api`, `/actuator/health`, `/uploads`) through frontend.
3. Switch traffic fully to frontend reverse proxy endpoint.
4. Remove backend host port publish (`8080`) in production compose.
5. Enable Mongo auth + app user credentials and rotate app connection URI.
6. Run smoke tests (auth, dashboard, uploads, invites, mentions).
7. Keep rollback artifacts:
   - previous compose file,
   - previous env file,
   - latest Mongo backup snapshot.

## 4) Acceptance Criteria

- No host port mapping for backend `8080` in production compose.
- No host port mapping for MongoDB `27017` in production compose.
- Public routes served only via frontend reverse proxy.
- Production startup excludes Mailhog unless `--profile debug` is explicitly used.
