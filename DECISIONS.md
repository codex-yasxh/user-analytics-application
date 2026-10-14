# Decisions

Key engineering decisions and their trade-offs, written for the reviewer interview.

### 1. Native MongoDB driver, not Mongoose

Mongoose adds schema middleware, casting, and a model layer. For a tracker that validates with Zod and needs exact control over bulk-write error codes (11000 for duplicates), the native driver is simpler and more transparent. The Zod schema in `packages/shared` is the single source of truth for event shape.

### 2. `text/plain` beacon payload to bypass CORS preflight

`sendBeacon` with `application/json` triggers a CORS `OPTIONS` preflight. Browsers frequently cancel preflight requests during page unload. Sending a `text/plain` Blob avoids the preflight entirely; the server parses the JSON body from the text content type. This maximizes delivery reliability on tab close.

### 3. Unordered bulk inserts for idempotent ingestion

`insertMany(docs, { ordered: false })` continues inserting remaining documents when one fails. Combined with the unique index on `{ eid: 1 }`, retried network batches skip duplicates (error code 11000) while inserting new events. The response breaks down `accepted`, `duplicates`, and `rejected` from the `MongoBulkWriteError` shape.

### 4. Independent X/Y scaling for heatmap projection

The dashboard computes `scaleX = renderWidth / doc_w` and `scaleY = renderHeight / doc_h`, scaling each axis independently. Pages change height across viewport widths (e.g. 776px at 1536px wide vs 1200px at 1280px wide), so a single scale factor derived from width alone drifts Y coordinates by hundreds of pixels. When the heatmap renders over an iframe, `renderHeight` is the iframe's scroll height; for external pages without an iframe, it falls back to uniform X scaling.

### 5. Viewport bucketing instead of fluid percentage scaling

Responsive CSS reflows elements across breakpoints — side-by-side buttons become stacked columns on mobile. Fluid percentage coordinates drift across layouts. Bucketing (`mobile` < 768, `tablet` < 1024, `desktop` >= 1024) ensures clicks are compared against the layout where the user actually clicked.

### 6. `pageX`/`pageY`, not `clientX`/`clientY`

`clientX`/`clientY` are viewport-relative and shift with scroll. `pageX`/`pageY` are document-relative and correspond to the actual element positions in the page flow. The heatmap renders over the full document, not the visible viewport, so page coordinates are the correct reference frame.

### 7. Queue cap at 100 events with oldest-dropped

The in-memory event queue is capped at 100 entries. When full, the oldest event is dropped. This bounds memory usage on the customer's page. Combined with the 3-second flush interval and 10-event flush threshold, the queue rarely fills unless the network is completely down.

### 8. Sessions derived by aggregation, not a separate collection

A `sessions` collection maintained at ingest time would make reads O(1) but adds write complexity and consistency risk. For a demo-scale dataset, the aggregation pipeline (`$sort` → `$group` → `$sort` → `$skip` → `$limit`) is acceptable. The README documents this as a known scale limitation and names the fix.

### 9. `cf.js` served from the static host, not the API

The tracking script loads from Vercel (always fast) while the API may be cold on Render's free tier. If `cf.js` were served from the API, a cold start would delay both the script load and the first event flush. Separating them means tracking starts immediately even during API wake-up.

### 10. Privacy: strip query strings from stored URLs

The server strips query parameters and hash fragments from the `url` field before persistence. Password-reset tokens, email addresses, and other sensitive data commonly appear in URL query strings. Storing only `origin + pathname` closes this privacy gap without losing analytics value — the `path` field already normalizes URLs the same way.
