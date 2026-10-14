# Architecture

## Overview

CausalFunnel is a three-layer analytics pipeline: a client-side tracker, an ingest API, and a dashboard.

```
Storefront                    Backend                     Dashboard
┌──────────┐   sendBeacon    ┌──────────────┐            ┌──────────────┐
│  cf.js   │ ──────────────> │ POST /events │            │  Sessions    │
│  2.4 KB  │   text/plain    │  Zod + bulk  │            │  Journeys    │
│  0 deps  │   no preflight  │  insert      │            │  Heatmap     │
└──────────┘                 └──────┬───────┘            └──────┬───────┘
                                   │                            │
                                   ▼                            │
                             ┌──────────┐     aggregation       │
                             │ MongoDB  │ <─────────────────────┘
                             └──────────┘
```

## Monorepo Layout

npm workspaces monorepo with four packages:

- **`packages/shared`** — Zod event schemas, path normalizer, viewport bucket helpers, constants. Consumed by server, tracker, seed scripts, and dashboard.
- **`tracker`** — TypeScript source compiled to a single IIFE via esbuild. Zero runtime dependencies. Output: `cf.js`.
- **`server`** — Express 5 HTTP server with native MongoDB driver. Routes, aggregation pipelines, middleware, and config.
- **`dashboard`** — React 19 + Vite. Sessions list, journey timeline, canvas heatmap with iframe overlay.

## Data Model

Single `events` collection. Sessions are derived by aggregation (simple writes, costlier reads — a documented trade-off).

```json
{
  "eid": "uuid",
  "session_id": "uuid",
  "type": "page_view | click",
  "url": "full URL",
  "path": "origin + pathname (normalized)",
  "ts": "Date (client, clamped)",
  "received_at": "Date (server)",
  "src": "live | seed",
  "vw": 1280,
  "vh": 800,
  "vw_bucket": "desktop | tablet | mobile",
  "x": 450,
  "y": 320,
  "doc_w": 1280,
  "doc_h": 2400,
  "sel": "button.add-to-cart"
}
```

## Indexes

Each index maps to a specific query pattern:

| Index                                | Query                                   |
| ------------------------------------ | --------------------------------------- |
| `{ eid: 1 }` unique                  | Idempotent ingest (duplicate detection) |
| `{ session_id: 1, ts: 1 }`           | Journey timeline for a session          |
| `{ path: 1, vw_bucket: 1, type: 1 }` | Heatmap click coordinates               |
| `{ path: 1, vw_bucket: 1, sel: 1 }`  | Top clicked elements                    |
| `{ ts: -1 }`                         | Sessions list (newest first)            |

Indexes are created by `npm run db:sync`, never as a side effect of the first request.

## Event Lifecycle

1. **Capture** — `cf.js` tracks page views and clicks in the browser, buffering events in memory.
2. **Flush** — Events are sent via `sendBeacon` (text/plain, no preflight) every 3s, at 10 events, or on page hide/unload. Fallback: `fetch` with `keepalive` + exponential retry.
3. **Ingest** — Server validates with Zod, normalizes `path`, derives `vw_bucket`, clamps `ts` to `received_at ± 24h`, and bulk-inserts with `ordered: false`. Duplicate `eid` values are silently dropped by the unique index.
4. **Read** — Dashboard queries sessions, journeys, and heatmap data via aggregation pipelines. All reads are index-backed (`IXSCAN`, no `COLLSCAN`).

## Deployment

- **Dashboard** — Vercel (static build + SPA rewrites via `vercel.json`)
- **API** — Render free tier (cold starts handled by dashboard waking indicator)
- **Database** — MongoDB Atlas free tier
- **Demo pages** — Served as static files from `dashboard/public/demo/`

## Docker Compose

`docker-compose.yml` provides a complete local stack:

- `mongo` — MongoDB 7 with healthcheck
- `api` — Node 22, connects to local Mongo
- `dashboard` — Vite dev server
- `seed` — One-shot container that syncs indexes and seeds data
