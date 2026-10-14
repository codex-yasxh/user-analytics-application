# Tracker (`cf.js`)

## Overview

`cf.js` is a standalone IIFE that tracks page views and clicks on any website. It's built from TypeScript via esbuild with zero runtime dependencies.

- **Size:** ~4.9 KB raw, ~2.4 KB gzipped
- **Dependencies:** None
- **Output:** Single IIFE, no module system required

## Installation

```html
<script
  src="/cf.js"
  data-endpoint="https://your-api.com/api/events"
  defer
></script>
```

The `data-endpoint` attribute is required. The tracker reads it from `document.currentScript`.

## What It Tracks

### Page Views

Fired on:

- Initial page load
- `history.pushState()` (SPA navigation)
- `history.replaceState()` (SPA navigation)
- `popstate` event (browser back/forward)

Only fires when the normalized path actually changes (no duplicate events for hash-only changes).

### Clicks

Captured via document-level capture listener. Each click records:

| Field            | Source                        | Description                                  |
| ---------------- | ----------------------------- | -------------------------------------------- |
| `x`, `y`         | `event.pageX`, `event.pageY`  | Document-relative coordinates                |
| `doc_w`, `doc_h` | `scrollWidth`, `scrollHeight` | Full document dimensions                     |
| `vw`, `vh`       | `innerWidth`, `innerHeight`   | Viewport size                                |
| `sel`            | DOM traversal                 | CSS selector (tag, id, classes, nth-of-type) |

Filtered out:

- Synthetic events (`event.isTrusted === false`)
- Keyboard-triggered clicks (`detail === 0` and coordinates at 0,0)

## Session Management

- Session ID: UUID v4, stored in `localStorage` (cookie fallback)
- Rotation: Sessions reset after 30 minutes of inactivity
- Generator: `crypto.randomUUID()` with `getRandomValues` v4 fallback

## Flush Strategy

Events are buffered in memory (max 100):

| Trigger             | Condition                     |
| ------------------- | ----------------------------- |
| **Count threshold** | 10 events accumulated         |
| **Timer**           | Every 3 seconds               |
| **Page hide**       | `visibilitychange` → `hidden` |
| **Page unload**     | `pagehide` event              |

### Transport

1. **Primary:** `navigator.sendBeacon()` with `text/plain` Blob (CORS-safelisted, no preflight)
2. **Fallback:** `fetch()` with `keepalive: true`
3. **Retry:** Exponential backoff, up to 3 attempts (250ms, 500ms, 1000ms)

`sendBeacon` returning `true` means the browser accepted the data for delivery — not that the server received it. Delivery is best-effort.

## Body Size Limit

Beacon payloads are kept under 63 KB (browser limit is ~64 KB). If the queue exceeds this, it's split into multiple batches.

## Guards

| Guard                   | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `window !== window.top` | Prevents tracking inside iframes (heatmap preview)    |
| `__cf` in window        | Prevents double initialization if script loaded twice |
| `?cf_ignore` in URL     | Disables tracking for admin/inspection                |
| DNT / GPC check         | Honors browser privacy signals                        |

## Diagnostic API

The tracker exposes `window.__cf`:

```js
window.__cf.sessionId; // Current session UUID
window.__cf.status; // "active" | "paused"
window.__cf.eventsQueued; // Current buffer length
window.__cf.eventsSent; // Cumulative events delivered to browser
window.__cf.lastFlush; // ISO timestamp of last flush
window.__cf.enable(); // Opt in if paused by DNT/GPC
```
