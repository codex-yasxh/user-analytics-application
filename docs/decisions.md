# Technical Decisions

Key trade-offs and the reasoning behind them.

---

### `text/plain` for beacon payload

**Choice:** Send events as `text/plain` instead of `application/json`.

**Why:** `sendBeacon` with `application/json` triggers a CORS preflight `OPTIONS` request. Browsers frequently drop preflights during page unload, losing the event batch. `text/plain` is CORS-safelisted — no preflight, maximum delivery reliability.

**Cost:** Server must parse stringified JSON from the text/plain body.

---

### `pageX`/`pageY` instead of `clientX`/`clientY`

**Choice:** Capture document-relative coordinates, not viewport-relative.

**Why:** `clientX`/`clientY` are relative to the visible viewport and ignore scroll position. On a long product page where the user scrolls down to click "Add to Cart", `clientY` might be 400px — the same as clicking the navbar at the top. `pageX`/`pageY` include scroll offset and map directly to document position.

**Companion data:** `doc_w` and `doc_h` (document scroll dimensions) are captured alongside for accurate scaling.

---

### 3-tier viewport bucketing

**Choice:** Classify every event into `mobile` (<768px), `tablet` (<1024px), or `desktop` (>=1024px) and render heatmaps at fixed reference widths (390, 768, 1280).

**Why:** Responsive layouts reflow dramatically across screen sizes. A button at x=900 on desktop might be at x=200 on mobile. Without bucketing, mobile clicks rendered on a desktop heatmap land in the wrong place.

**Cost:** Clicks on different viewport widths within the same bucket scale uniformly. Layouts that shift dramatically within a bucket (e.g., 1024px vs 1279px) show slight offset.

---

### Single `events` collection (no `sessions` table)

**Choice:** Store all events in one collection. Derive sessions via aggregation pipeline.

**Why:** Simple writes. No distributed two-phase writes during high-throughput ingest. One collection, one insert path.

**Cost:** Session list queries require an aggregation scan over events. At scale (millions of events), a dedicated `sessions` collection updated incrementally at ingest would be faster.

---

### Client `eid` + unique index for idempotency

**Choice:** Every event carries a client-generated UUID `eid`. MongoDB has a unique index on `{ eid: 1 }`.

**Why:** Network retries (beacon failure → fetch fallback → retry) can re-send the same batch. Without deduplication, retries double-count events. The unique index silently drops duplicates via `insertMany({ ordered: false })`.

---

### Clamp `ts` to `received_at ± 24h`

**Choice:** Server rejects client timestamps more than 24 hours from server time.

**Why:** Client clocks can be wrong — timezone misconfiguration, manual clock changes, stale browser tabs. Unclamped timestamps corrupt journey ordering and session grouping.

---

### `cf.js` instead of `tracker.js`

**Choice:** Name the tracking script `cf.js`, not `tracker.js` or `analytics.js`.

**Why:** Ad blockers (uBlock Origin, Brave Shields, Pi-hole) maintain filter lists that block URLs matching `/tracker`, `/analytics`, `/beacon`. A neutral filename avoids silent blocking.

---

### No auth, no WebSockets

**Choice:** No authentication layer. No real-time WebSocket streaming.

**Why:** Both are explicit non-goals for this assignment. Auth adds a login screen that blocks the reviewer from evaluating the product. WebSockets add fragile connection state for no rubric value. CORS is split instead: ingest is open (trackers must accept events from any origin), reads are restricted to the dashboard origin.

**What I'd do next:** API key auth + tenant isolation for production. WebSocket push for a live event feed.

---

### Native MongoDB driver (no Mongoose)

**Choice:** Use the native `mongodb` driver instead of Mongoose.

**Why:** Eliminates ORM overhead. Zod schemas in `packages/shared` are the single source of truth for validation. The native driver gives fine-grained access to `MongoBulkWriteError` (code 11000) for duplicate detection during idempotent ingest.

---

### Express parses both `application/json` and `text/plain`

**Choice:** The ingest endpoint accepts both content types.

**Why:** `sendBeacon` sends `text/plain`. Direct `fetch` calls send `application/json`. Supporting both means the tracker works regardless of which transport path fires.
