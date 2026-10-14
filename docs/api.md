# API Reference

Base URL: `https://user-analytics-application-causalfunnel.onrender.com`

All endpoints return JSON. Errors follow a consistent format:

```json
{ "error": { "code": "BAD_REQUEST", "message": "Human readable error" } }
```

Error codes: `BAD_REQUEST`, `NOT_FOUND`, `INGEST_DISABLED`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_SERVER_ERROR`, `DATABASE_UNAVAILABLE`.

---

## Endpoints

### `POST /api/events`

Ingest a batch of 1–50 events.

**Body** (JSON or `text/plain`):

```json
{
  "events": [
    {
      "eid": "uuid",
      "session_id": "uuid",
      "type": "page_view",
      "url": "https://example.com/page",
      "ts": "2026-10-14T12:00:00Z",
      "vw": 1280,
      "vh": 800
    }
  ]
}
```

Click events additionally include: `x`, `y`, `doc_w`, `doc_h`, `sel`.

**Response** `202`:

```json
{ "accepted": 5, "duplicates": 0, "rejected": 0 }
```

Duplicates (matching `eid`) are counted as accepted — ingest is idempotent.

---

### `GET /api/sessions`

Paginated list of sessions, newest activity first.

| Param   | Default | Description              |
| ------- | ------- | ------------------------ |
| `page`  | 1       | Page number              |
| `limit` | 20      | Items per page (max 100) |

**Response**:

```json
{
  "data": [
    {
      "session_id": "uuid",
      "event_count": 7,
      "first_seen": "2026-10-13T10:00:00Z",
      "last_seen": "2026-10-13T10:05:00Z",
      "entry_path": "https://example.com/home"
    }
  ],
  "total": 30,
  "page": 1,
  "limit": 20
}
```

---

### `GET /api/sessions/:id/events`

Full event timeline for a session, ordered by `ts` ascending.

Returns `404` if the session ID doesn't exist.

**Response**:

```json
{
  "session_id": "uuid",
  "events": [
    {
      "eid": "uuid",
      "type": "page_view",
      "url": "https://example.com/home",
      "path": "https://example.com/home",
      "ts": "2026-10-13T10:00:00Z",
      "vw": 1280,
      "vh": 800
    }
  ],
  "truncated": false
}
```

Events are capped at 1,000. If truncated, `truncated: true`.

---

### `GET /api/pages`

Distinct normalized page paths ranked by total clicks.

**Response**:

```json
[{ "path": "https://example.com/demo/home.html", "clicks": 45 }]
```

---

### `GET /api/heatmap`

Click coordinates for a specific page and viewport bucket.

| Param    | Required | Description                             |
| -------- | -------- | --------------------------------------- |
| `path`   | Yes      | Normalized page path                    |
| `bucket` | No       | `desktop` (default), `tablet`, `mobile` |
| `limit`  | No       | Max points (default 5000)               |

**Response**:

```json
{
  "path": "https://example.com/home",
  "bucket": "desktop",
  "reference_width": 1280,
  "total": 120,
  "returned": 120,
  "points": [
    { "x": 450, "y": 320, "doc_w": 1280, "doc_h": 2400, "vw": 1280, "vh": 800 }
  ]
}
```

---

### `GET /api/elements`

Top clicked elements grouped by CSS selector.

| Param    | Required | Description                             |
| -------- | -------- | --------------------------------------- |
| `path`   | Yes      | Normalized page path                    |
| `bucket` | No       | `desktop` (default), `tablet`, `mobile` |
| `limit`  | No       | Max elements (default 20)               |

**Response**:

```json
{
  "path": "https://example.com/home",
  "bucket": "desktop",
  "elements": [{ "sel": "button.add-to-cart", "count": 25 }]
}
```

---

### `GET /health`

Liveness check. Always returns `200 { status: "ok" }`.

### `GET /ready`

Readiness check. Pings MongoDB. Returns `200 { status: "ready" }` or `503` if database is unavailable.

---

## Configuration

| Env Variable         | Description                                 |
| -------------------- | ------------------------------------------- |
| `MONGO_URL`          | MongoDB connection string                   |
| `PORT`               | Server port (default 4000)                  |
| `DASHBOARD_ORIGIN`   | Allowed origin for read API CORS            |
| `DEMO_ORIGIN`        | Demo store origin for path resolution       |
| `INGEST_ENABLED`     | Set `false` to reject all events with `503` |
| `RATE_LIMIT_ENABLED` | Set `false` to disable rate limiting        |
| `LOG_LEVEL`          | pino log level (default `info`)             |
