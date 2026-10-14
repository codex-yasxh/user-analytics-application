# Architecture

## System diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Visitor's Browser                        │
│  ┌─────────────┐                                                │
│  │  Demo Store  │ ──loads──▶ cf.js (tracker IIFE, ~2.4 KB gz)   │
│  └─────────────┘            │                                   │
│                             │ sendBeacon (text/plain, no CORS   │
│                             │ preflight) every 3s or 10 events  │
│                             ▼                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Vercel (static)   │
                    │  - Dashboard SPA   │
                    │  - Demo store HTML │
                    │  - cf.js           │
                    └───────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Render (API)      │
                    │  Express 5 + pino  │
                    │  /api/events POST  │
                    │  /api/sessions GET │
                    │  /api/pages    GET │
                    │  /api/heatmap  GET │
                    │  /api/elements GET │
                    │  /health /ready    │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  MongoDB Atlas     │
                    │  events collection │
                    │  3 indexes         │
                    └───────────────────┘
```

## Package map

| Package           | Purpose                                             | Dependencies                         |
| ----------------- | --------------------------------------------------- | ------------------------------------ |
| `packages/shared` | Zod schemas, constants, `normalizePath`, `bucketOf` | zod                                  |
| `tracker`         | Client-side IIFE (`cf.js`), compiled by esbuild     | `@cf/shared` (build-time)            |
| `server`          | Express API, native MongoDB driver                  | `@cf/shared`, express, mongodb, pino |
| `dashboard`       | Vite + React 19 SPA, inline styles                  | `@cf/shared` (types only)            |
| `demo`            | Static HTML store pages                             | None                                 |
| `scripts`         | seed, sync-indexes, explain, copy-demo              | `@cf/shared`, mongodb                |

## Data flow

1. **Capture:** `cf.js` captures `page_view` (on load) and `click` (with `pageX`/`pageY`, `sel`, document dimensions) events, assigns a UUID `eid` and `session_id`, queues them in memory.
2. **Flush:** Every 3 seconds, at 10 queued events, or on `pagehide`, the queue is serialized as JSON and sent via `sendBeacon` with `Content-Type: text/plain` to `POST /api/events`.
3. **Ingest:** The server validates each event with the shared Zod schema, computes `path` (origin + pathname, no query string), `vw_bucket`, `received_at`, and `src`, then bulk-inserts with `ordered: false`. Duplicates (same `eid`) are silently skipped via the unique index.
4. **Read:** The dashboard calls the read APIs. Sessions are derived by aggregation (`$group` by `session_id`). Heatmap queries filter by `type: click`, `path`, and `vw_bucket`, sorted by `ts desc` using the compound index.

## Indexes and query mapping

| Index             | Fields                                       | Serves                                       |
| ----------------- | -------------------------------------------- | -------------------------------------------- |
| `eid_unique`      | `{ eid: 1 }` unique                          | Idempotent ingest (duplicate detection)      |
| `session_journey` | `{ session_id: 1, ts: 1, _id: 1 }`           | Journey query, sessions aggregation pre-sort |
| `heatmap_lookup`  | `{ type: 1, path: 1, vw_bucket: 1, ts: -1 }` | Heatmap, elements, pages queries             |

Run `npm run explain` to print the `queryPlanner.winningPlan` for each query. The heatmap and journey queries use index-provided sort order (no in-memory SORT stage).

## Failure modes

| Failure                           | Behavior                                                                                                | Recovery                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| API cold start (Render free tier) | Tracker queues events in memory, retries with backoff. Dashboard shows "waking" banner with auto-retry. | Automatic; up to 2 minutes                  |
| MongoDB unreachable               | `POST /api/events` returns 503 `DATABASE_UNAVAILABLE`. `GET /ready` returns 503.                        | Tracker retries; dashboard retries          |
| Beacon rejected at page unload    | Best-effort; browser may cancel the request. Some events may be lost.                                   | Next page load captures a fresh `page_view` |
| Duplicate events (network retry)  | `insertMany({ ordered: false })` + unique `eid` index silently drops duplicates                         | Automatic; no data corruption               |
| Tracker script blocked            | No events captured. No errors on the host page (IIFE is self-contained).                                | N/A                                         |
| Rate limit exceeded               | 429 response. Tracker backs off and retries.                                                            | Automatic after window resets               |
| `INGEST_ENABLED=false`            | 503 `INGEST_DISABLED`. All events rejected.                                                             | Toggle env var and restart                  |

## Key constants

| Constant             | Value       | Location                           |
| -------------------- | ----------- | ---------------------------------- |
| `MAX_BATCH`          | 50 events   | `packages/shared/src/constants.ts` |
| `BODY_LIMIT`         | 100 KB      | `packages/shared/src/constants.ts` |
| `SESSION_IDLE_MS`    | 30 minutes  | `packages/shared/src/constants.ts` |
| `FLUSH_INTERVAL_MS`  | 3000 ms     | `packages/shared/src/constants.ts` |
| `FLUSH_AT`           | 10 events   | `packages/shared/src/constants.ts` |
| `QUEUE_CAP`          | 100 events  | `packages/shared/src/constants.ts` |
| `HEATMAP_LIMIT_MAX`  | 5000 points | `packages/shared/src/constants.ts` |
| `ELEMENTS_LIMIT_MAX` | 200 rows    | `packages/shared/src/constants.ts` |
