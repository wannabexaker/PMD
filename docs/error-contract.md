# PMD Error Contract (Frontend ↔ Backend)

This document defines the standard API error shape and semantic codes used by UI flows.

## Error Envelope

All API errors return:

```json
{
  "timestamp": "2026-02-25T12:34:56Z",
  "status": 403,
  "error": "Forbidden",
  "code": "FORBIDDEN",
  "message": "Not allowed",
  "path": "/api/workspaces/{id}/roles",
  "requestId": "2d5b5be5-7d9b-4f5a-89e2-0b5ab26f7c4f",
  "fieldErrors": {
    "password": "Password must include a symbol."
  }
}
```

Notes:
- `fieldErrors` appears only for validation failures.
- `requestId` is always included when request-id tracing is active.

## Canonical Codes

- `VALIDATION_FAILED` -> HTTP `400`
- `UNAUTHORIZED` -> HTTP `401`
- `FORBIDDEN` -> HTTP `403`
- `NOT_FOUND` -> HTTP `404`
- `CONFLICT` -> HTTP `409`
- `RATE_LIMITED` -> HTTP `429`
- `INTERNAL_ERROR` -> HTTP `500`
- `REQUEST_FAILED` -> fallback/unknown

## Frontend Mapping

Frontend maps `code` first, then falls back to `status`:

- `validation` -> inline validation + compact toast
- `forbidden` -> permission-aware UI message
- `rate_limited` -> retry guidance
- `server` -> generic fallback with optional support reference

Request IDs from failed calls are available via `ApiError.requestId` to correlate UI incidents with backend logs.

