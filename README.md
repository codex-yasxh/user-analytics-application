# CausalFunnel Analytics

A lightweight, privacy-conscious event tracker and analytics dashboard for storefront interactions.

**Status:** Walking skeleton deployed and verified end-to-end against hosted Render API and MongoDB Atlas.

## Try It in 60 Seconds

The walking skeleton is live:

- **Demo Store:** [https://causal-funnel-dashboard-gamma.vercel.app/demo/home.html](https://causal-funnel-dashboard-gamma.vercel.app/demo/home.html)
- **Dashboard:** [https://causal-funnel-dashboard-gamma.vercel.app/](https://causal-funnel-dashboard-gamma.vercel.app/)
- **Hosted API Health:** [https://user-analytics-application-causalfunnel.onrender.com/health](https://user-analytics-application-causalfunnel.onrender.com/health)
- **Hosted API Readiness:** [https://user-analytics-application-causalfunnel.onrender.com/ready](https://user-analytics-application-causalfunnel.onrender.com/ready)

> *Note: Hosted API runs on Render; initial wake from cold start may take up to 60 seconds.*

## Run Locally

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- Docker Desktop (for local MongoDB container)

### Quick Start

1. Set up environment variables and install dependencies:
   ```bash
   cp .env.example .env
   npm install
   ```

2. Start the local database:
   ```bash
   npm run db:up
   ```

3. Launch server, dashboard, and tracker build watcher concurrently:
   ```bash
   npm run dev
   ```

4. Open the local services:
   - Demo Store: [http://localhost:5173/demo/home.html](http://localhost:5173/demo/home.html)
   - Dashboard: [http://localhost:5173/](http://localhost:5173/)
   - API: [http://localhost:4000/health](http://localhost:4000/health)

## Quality Gate

Run full verification suite (lint, typecheck, tests across all workspaces):

```bash
npm run check
```
