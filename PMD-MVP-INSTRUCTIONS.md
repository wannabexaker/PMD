# PMD-MVP Claude Code Instructions (Mono-Repo)

## Overview
Goal: Build a professional MVP for a Project Management tool with:
- Backend: Spring Boot + MongoDB
- Frontend: React + TypeScript (Vite)
- DevOps: Docker Compose + GitHub Actions CI

Keep it minimal but stable. Avoid over-engineering.

---

## Repo Structure (Mono-Repo)
```
/backend
/frontend
/docker-compose.yml
/.github/workflows/
README.md
.env.example
```

---

## Phase 1 Backend (Spring Boot + MongoDB)

### Stack
- Java 21
- Spring Boot (latest stable 3.x/4.x)
- Spring Web
- Spring Data MongoDB
- Validation
- Actuator
- Maven
- Lombok (optional)

### Domain
- Project
  - id (String)
  - name (required)
  - description (optional)
  - createdAt, updatedAt
- Task
  - id (String)
  - projectId (String)
  - title (required)
  - description (optional)
  - status (TODO/DOING/DONE)
  - dueDate (optional)
  - createdAt, updatedAt

### REST API
- GET /api/projects
- POST /api/projects
- GET /api/projects/{id}
- PUT /api/projects/{id}
- DELETE /api/projects/{id}
- GET /api/projects/{id}/tasks
- POST /api/projects/{id}/tasks
- GET /api/tasks/{id}
- PUT /api/tasks/{id}
- DELETE /api/tasks/{id}

### Rules
- Use DTOs, never expose Mongo entities directly
- Validation: name/title required, status enum
- Error handling:
  - 400 on validation
  - 404 on not found
  - structured JSON error response
- Enable @EnableMongoAuditing for createdAt/updatedAt
- CORS allow http://localhost:5173

### Config
- application.yml (no properties)
- Mongo via env:
  - SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/pmd
- Actuator health at /actuator/health

### Output
- Full Spring project in /backend
- Controllers, services, repositories, DTOs, mappers
- README in /backend with run steps

---

## Phase 2 Frontend (React + TSX)

### Stack
- Vite
- React + TypeScript
- Axios
- React Router
- Minimal CSS (no UI library for now)

### Pages
- /projects (list + create)
- /projects/:id (details + tasks list + add task)

### Rules
- Axios base URL from VITE_API_BASE_URL
- Show loading + error states
- Types for Project/Task
- Handle empty lists

### Output
- Full Vite project in /frontend
- src/api Axios client
- .env.example

---

## Phase 3 DevOps (Docker + CI)

### Docker Compose
Services:
- mongo (port 27017, volume persistence)
- backend (port 8080)
- frontend (port 5173)

Environment:
- backend -> mongo host: mongo
- frontend -> VITE_API_BASE_URL=http://localhost:8080

### GitHub Actions
- Backend: mvn test or mvn -DskipTests package
- Frontend: npm ci + npm run build
- (Optional) Docker build steps commented

### Root README
Include:
- docker compose up
- local dev steps
- env setup

---

## Common Pitfalls to Avoid
- Forgetting @EnableMongoAuditing
- Exposing Mongo entities directly
- No CORS setup
- Missing env vars in Docker
- Hardcoding secrets

---

## Instructions to Claude
- Build step-by-step
- Commit only working code
- If stuck, explain error and propose fix
- Keep it MVP: no security/JWT yet
