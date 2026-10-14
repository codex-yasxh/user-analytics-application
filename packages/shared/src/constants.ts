// Maximum number of events allowed per ingest request batch
export const MAX_BATCH = 50;

// Maximum request body size in bytes (100 KB)
export const BODY_LIMIT = 100 * 1024;

// Session inactivity timeout before rotation in milliseconds (30 minutes)
export const SESSION_IDLE_MS = 30 * 60 * 1000;

// Periodic queue flush interval in milliseconds (3000 ms)
export const FLUSH_INTERVAL_MS = 3000;

// Queue event threshold to trigger an immediate flush (10 events)
export const FLUSH_AT = 10;

// Maximum number of queued events in the tracker buffer (100 events, drops oldest)
export const QUEUE_CAP = 100;

// Maximum number of delivery retries with backoff before dropping events (3 retries)
export const RETRY_MAX = 3;

// Permissible timestamp skew window in milliseconds (24 hours around received_at)
export const TS_WINDOW_MS = 24 * 60 * 60 * 1000;

// Viewport width upper boundaries: mobile < 768, tablet < 1024, else desktop
export const BUCKET_MAX = {
  mobile: 768,
  tablet: 1024,
} as const;

// Canonical reference render widths in pixels for each viewport bucket
export const REFERENCE_WIDTH = {
  mobile: 390,
  tablet: 768,
  desktop: 1280,
} as const;

// Maximum allowable x coordinate value in pixels
export const X_MAX = 50000;

// Maximum allowable y coordinate value in pixels
export const Y_MAX = 500000;

// Maximum allowable length of CSS selector string in characters
export const SEL_MAX = 120;

// Maximum number of points returned in a single heatmap query response
export const HEATMAP_LIMIT_MAX = 5000;

// Maximum number of ordered events returned for a session journey
export const JOURNEY_CAP = 1000;

// Maximum number of sessions returned per page in sessions query
export const SESSIONS_LIMIT_MAX = 100;

// Maximum number of element rows returned in a top-clicked-elements query
export const ELEMENTS_LIMIT_MAX = 200;
