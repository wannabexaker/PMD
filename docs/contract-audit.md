# PMD Contract Audit

Date: 2026-01-23

## Frontend API map

Source files:
- `frontend/pmd-frontend/src/api/http.ts`
- `frontend/pmd-frontend/src/api/auth.ts`
- `frontend/pmd-frontend/src/api/projects.ts`
- `frontend/pmd-frontend/src/api/users.ts`
- `frontend/pmd-frontend/src/types.ts`

Auth (all use `requestJson` => sends `Authorization: Bearer <token>` if present)
- POST `/api/auth/login`
  - Request body: `{ username: string, password: string }` (from `LoginPayload`)
  - Response: `{ token?: string, user?: User }` (from `AuthResponse`)
  - Auth header: sent if token exists (login still works without)
- POST `/api/auth/register`
  - Request body: `{ email, password, confirmPassword, firstName, lastName, team?, bio? }` (from `RegisterPayload`)
  - Response: `AuthResponse` (ignored)
  - Auth header: sent if token exists
- GET `/api/auth/me`
  - Response: `User`
  - Auth header: required
- PUT `/api/auth/me`
  - Request body: `{ email, firstName, lastName, team, bio? }` (from `UpdateProfilePayload`)
  - Response: `User`
  - Auth header: required

Users
- GET `/api/users`
  - Query params: `q?`, `team?`
  - Response: `UserSummary[]` (`{ id, displayName, email, team }`)
  - Auth header: required

Projects
- GET `/api/projects`
  - Response: `Project[]`
  - Auth header: required
- GET `/api/projects/{id}`
  - Response: `Project | null` (frontend wraps error -> null)
  - Auth header: required
- POST `/api/projects`
  - Request body: `{ name, description?, status, memberIds? }` (from `CreateProjectPayload`)
  - Response: `Project`
  - Auth header: required
- PUT `/api/projects/{id}`
  - Request body: `{ name, description?, status, memberIds }` (from `CreateProjectPayload`)
  - Response: `Project`
  - Auth header: required
- DELETE `/api/projects/{id}`
  - Response: `void`
  - Auth header: required
- POST `/api/projects/{id}/comments`
  - Request body: `{ authorId, message, timeSpentMinutes }` (from `AddCommentPayload`)
  - Response: `Project`
  - Auth header: required

## Backend API map

Controllers:
- `backend/pmd-backend/src/main/java/com/pmd/auth/controller/AuthController.java`
- `backend/pmd-backend/src/main/java/com/pmd/user/controller/UserController.java`
- `backend/pmd-backend/src/main/java/com/pmd/project/controller/ProjectController.java`
- `backend/pmd-backend/src/main/java/com/pmd/person/controller/PersonController.java`
- `backend/pmd-backend/src/main/java/com/pmd/config/ApiExceptionHandler.java`

Security rules:
- Public: `POST /api/auth/login`, `POST /api/auth/register`, `GET /actuator/health/**`
- Authenticated: `/api/**`

Auth
- POST `/api/auth/login`
  - Request DTO: `LoginRequest { username, password }`
  - Response DTO: `LoginResponse { token, user: UserResponse }`
  - Errors: `401 Invalid credentials` (ResponseStatusException), validation `400` (via `ApiExceptionHandler`)
- POST `/api/auth/register`
  - Request DTO: `RegisterRequest { email, password, confirmPassword, firstName, lastName, team?, bio? }`
  - Response DTO: `LoginResponse { token, user: UserResponse }`
  - Errors: `409 User already exist`, `400 Passwords do not match`, validation `400`
- GET `/api/auth/me`
  - Response DTO: `UserResponse`
  - Errors: `401 Unauthorized`
- PUT `/api/auth/me`
  - Request DTO: `UpdateProfileRequest { firstName, lastName, email, team, bio? }`
  - Response DTO: `UserResponse`
  - Errors: `401 Unauthorized`, validation `400`

Users
- GET `/api/users`
  - Query params: `q?`, `team?`
  - Response DTO: `UserSummaryResponse { id, displayName, email, team }[]`
  - Errors: none explicit (inherits security + validation)

Projects
- POST `/api/projects`
  - Request DTO: `ProjectRequest { name, description?, status, memberIds? }`
  - Response DTO: `ProjectResponse { id, name, description, status, memberIds, comments?, createdAt, updatedAt }`
  - Status: `201 Created`
  - Errors: validation `400`
- GET `/api/projects`
  - Response: `ProjectResponse[]`
- GET `/api/projects/{id}`
  - Response: `ProjectResponse`
  - Errors: `404 Project not found`
- PUT `/api/projects/{id}`
  - Request DTO: `ProjectRequest { name, description?, status, memberIds? }`
  - Response: `ProjectResponse`
  - Errors: `404 Project not found`, validation `400`
- DELETE `/api/projects/{id}`
  - Status: `204 No Content`
  - Errors: `404 Project not found`
- POST `/api/projects/{id}/comments`
  - Request DTO: `ProjectCommentRequest { authorId, message, timeSpentMinutes }`
  - Response: `ProjectResponse`
  - Errors: `404 Project not found`, `404 User not found`, validation `400`

People (not used by frontend)
- POST `/api/people`
- GET `/api/people`
- GET `/api/people/{id}`

Global error shape:
- `ApiExceptionHandler` returns `{ message, fieldErrors? }` for `ResponseStatusException` and validation errors.

## Mismatch list

1) Frontend `fetchProject` swallows errors and returns `null`, while `ProjectDetails` expects a thrown 404 to show "Project not found".
   - Frontend: `frontend/pmd-frontend/src/api/projects.ts`
   - UI: `frontend/pmd-frontend/src/components/ProjectDetails.tsx`

2) Backend exposes `/api/people` endpoints, but frontend never uses them.
   - Backend: `backend/pmd-backend/src/main/java/com/pmd/person/controller/PersonController.java`

## Minimal fix plan

- Align `fetchProject` to surface 404 (or return a typed `{ status }` error) so UI can show "Project not found" deterministically.
- Keep `/api/people` as legacy/internal unless explicitly removed; no frontend usage.
- Ensure all error responses include `{ message }` (already handled by `ApiExceptionHandler`).

## Applied changes

- Frontend: `fetchProject` now surfaces errors (including 404) so the UI can deterministically show "Project not found".
  - File: `frontend/pmd-frontend/src/api/projects.ts`
