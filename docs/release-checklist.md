# PMD Pre-release Checklist

Use this list before tagging a release. Run from `C:\Users\Jiannis\pmd`.

## Frontend
```
cd frontend/pmd-frontend
npm ci
npm run lint
npm run build
```

## Backend
```
cd backend/pmd-backend
.\mvnw.cmd -q -DskipTests=false test
.\mvnw.cmd -q -DskipTests package
```

## Compose sanity (reviewer)
```
cd C:\Users\Jiannis\pmd
docker compose -f docker-compose.local.yml --profile reviewer up -d --build
curl.exe -s http://localhost:8080/actuator/health
```
Open http://localhost:5173 and confirm login + workspaces page loads.

## Notes
- If `npm ci` fails with `EPERM` on `esbuild.exe`, close running Node/Vite processes and retry.
- Reviewer compose uses fixed ports. Dev mode runs backend locally on random port with Vite proxy.
