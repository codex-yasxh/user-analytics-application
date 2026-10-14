# Privacy

## What We Collect

- Page URL (query strings and hash fragments stripped before storage)
- Click coordinates (`pageX`, `pageY`) and document dimensions
- Viewport size (`innerWidth`, `innerHeight`)
- CSS selector of clicked element (tag, id, primary classes — max 120 chars)
- Session ID (random UUID, stored in localStorage)
- Timestamps (client-side, clamped by server)

## What We Don't Collect

- No form values, input content, passwords, or textarea content
- No inner text or HTML attributes (selectors are structural only)
- No IP addresses or user-agent strings (stripped before storage)
- No cookies beyond session management
- No fingerprinting or cross-site tracking

## Do Not Track & Global Privacy Control

`cf.js` checks `navigator.doNotTrack` and `navigator.globalPrivacyControl` on initialization. If either signal is active, tracking halts immediately with zero network egress. A console message is logged:

```
CausalFunnel tracking paused because DNT or GPC is enabled.
```

The demo store's status chip shows the paused state. Users can manually opt in via `window.__cf.enable()` for local testing.

## Self-Tracking Prevention

The tracker includes two guards against polluting analytics data:

1. **Top-frame guard:** `window !== window.top` check prevents tracking when the page is loaded inside an iframe (e.g., the heatmap preview).
2. **`cf_ignore` param:** URLs containing `?cf_ignore` skip tracking entirely. Used by the heatmap iframe to load demo pages without generating events.

## Data Retention

No automatic TTL or retention policy is configured in this version. All events persist until manually deleted. In production, a TTL index on `received_at` would enforce automatic expiration.
