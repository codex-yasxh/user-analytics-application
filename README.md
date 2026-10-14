# CausalFunnel Analytics

Drop a 2.3 KB script on any page — get sessions, journeys, and heatmaps.

[![CI](https://github.com/codex-yasxh/user-analytics-application-CausalFunnel/actions/workflows/ci.yml/badge.svg)](https://github.com/codex-yasxh/user-analytics-application-CausalFunnel/actions/workflows/ci.yml)

---

## Live

- **Dashboard:** [https://causal-funnel-dashboard-gamma.vercel.app](https://causal-funnel-dashboard-gamma.vercel.app/)
- **Demo Store:** [https://causal-funnel-dashboard-gamma.vercel.app/demo/home.html](https://causal-funnel-dashboard-gamma.vercel.app/demo/home.html)
- **API:** [https://user-analytics-application-causalfunnel.onrender.com](https://user-analytics-application-causalfunnel.onrender.com/health)
- **Preview Video:** [https://drive.google.com/drive/folders/1s7bSR...](https://drive.google.com/drive/folders/1s7bSR_BsclL-jpHlNQI3lQ4SoazSYMB7?usp=sharing)

> API is on Render free tier — first request after idle takes 30–60s. Dashboard retries automatically.

---

## Run Locally

```bash
cp .env.example .env
npm ci
npm run db:up          # start local MongoDB via Docker
npm run db:sync        # create indexes
npm run seed           # seed 30 demo sessions
npm run dev            # start API + dashboard + tracker watcher
```

Dashboard: [localhost:5173](http://localhost:5173) · Demo Store: [localhost:5173/demo/home.html](http://localhost:5173/demo/home.html) · API: [localhost:4000/health](http://localhost:4000/health)

Without Docker, set `MONGO_URL` in `.env` to your MongoDB URI and skip `db:up`.

---

## Embed the Tracker

```html
<script
  src="https://causal-funnel-dashboard-gamma.vercel.app/cf.js"
  data-endpoint="https://user-analytics-application-causalfunnel.onrender.com/api/events"
  defer
></script>
```

That's it. Zero dependencies, works on any site.

---

## Stack

| Layer     | Tech                                                     |
| --------- | -------------------------------------------------------- |
| Tracker   | TypeScript → esbuild IIFE (`cf.js`), 2.3 KB gzip, 0 deps |
| API       | Express 5, Zod validation, native MongoDB driver         |
| Database  | MongoDB (Atlas hosted, local via Docker)                 |
| Dashboard | React 19, Vite, TypeScript                               |
| Hosting   | Vercel (dashboard) + Render (API) + Atlas (DB)           |

---

## Checks

```bash
npm run check          # lint + typecheck + prettier + 77 tests
```

---

## Docs

Detailed documentation lives in [`docs/`](docs/):

- [Architecture](docs/architecture.md) — system design, data flow, event lifecycle
- [API Reference](docs/api.md) — endpoints, parameters, error format
- [Decisions](docs/decisions.md) — technical trade-offs and rationale
- [Heatmap](docs/heatmap.md) — coordinate math, viewport bucketing, rendering
- [Privacy](docs/privacy.md) — data minimization, DNT/GPC, what we collect
- [Tracker](docs/tracker.md) — cf.js internals, session management, flush strategy

---

## Project Structure

```
├── packages/shared/       Zod schemas, normalizers, bucket helpers
├── tracker/               cf.js source + esbuild + tests
├── server/                Express API + MongoDB pipelines + tests
├── dashboard/             React 19 + Vite analytics UI
│   └── public/demo/       Demo store with tracking status chip
├── scripts/               seed, sync-indexes, capture-hotspots, explain
├── e2e/                   Playwright proof tests
├── docs/                  Architecture, API, decisions, privacy docs
└── docker-compose.yml     Full local stack
```
