# FLEETMARK — Public API

The browser SPA authenticates with a JWT (42 OAuth login). Separately, a small,
**read-only** surface is exposed for external/programmatic consumers, gated by a
static API key.

## Authentication

Send the key in the `X-API-Key` header:

```
X-API-Key: <SSBS_API_KEY from the environment>
```

Endpoints in the public surface accept **either** a valid `X-API-Key` **or** a
logged-in session (so the SPA keeps working). This is enforced by the
`HasAPIKeyOrIsAuthenticated` permission (`apps/users/permissions.py`). The key is
compared in constant time (`hmac.compare_digest`).

## Public endpoints (read-only)

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/v1/stations/` | List of stations (bus stops) |
| GET | `/api/v1/stations/{id}/` | A single station |
| GET | `/api/v1/routes/` | Routes with their ordered stations |
| GET | `/api/v1/routes/{id}/` | A single route |

Write operations (`POST`/`PUT`/`PATCH`/`DELETE`) on these resources remain
**staff-only** (JWT with `role=LOGISTICS_STAFF`) — the API key grants read access
only.

## What is NOT public

Everything else requires an authenticated session: reservations, trips
management, drivers, users, reports, announcements, and all admin actions. The
API key does not grant access to any of these.

## Notes

- The global DRF default permission is `IsAuthenticated`; the API key is applied
  deliberately to the endpoints above, not globally. (Fixes audit finding **M2**:
  the previous global `HasAPIKey` default was overridden by every view and gated
  nothing.)
- OpenAPI schema / Swagger UI: `/api/docs/swagger-ui/`.
