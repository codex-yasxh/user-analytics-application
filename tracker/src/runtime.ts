import { FLUSH_AT, FLUSH_INTERVAL_MS, RETRY_MAX } from '@cf/shared/constants';
import { normalizePath } from '@cf/shared/normalize-path';
import {
  createSessionManager,
  createUuid,
  enableTracking,
  isPaused,
} from './identity.js';
import { buildSelector } from './selector.js';
import { EventQueue } from './queue.js';
import { safe } from './safe.js';
import type { TrackerStatus, TrackedEvent } from './types.js';

// sendBeacon has a ~64 KB per-request limit; keep under it.
const BODY_MAX = 63 * 1024;

export function installTracker(win: Window, doc: Document): void {
  const script = doc.currentScript as HTMLScriptElement | null;
  const endpoint = script?.dataset.endpoint;
  if (
    !endpoint ||
    '__cf' in win ||
    safe(() => win !== win.top, true) ||
    win.location.search.includes('cf_ignore')
  )
    return;

  const sessions = createSessionManager(win);
  const queue = new EventQueue<TrackedEvent>();
  let sent = 0;
  let lastFlush: string | null = null;
  let lastPath = normalizePath(win.location.href);
  let started = false;

  const retry = (events: TrackedEvent[], attempt: number): void => {
    if (attempt < RETRY_MAX)
      win.setTimeout(() => deliver(events, attempt + 1), 250 * 2 ** attempt);
  };

  const deliver = (events: TrackedEvent[], attempt = 0): void => {
    const body = JSON.stringify({ events });
    try {
      if (
        win.navigator.sendBeacon?.(
          endpoint,
          new Blob([body], { type: 'text/plain' }),
        )
      ) {
        sent += events.length;
        lastFlush = new Date().toISOString();
        return;
      }
      void win
        .fetch(endpoint, {
          method: 'POST',
          body,
          keepalive: true,
          headers: { 'Content-Type': 'text/plain' },
        })
        .then((response) => {
          if (!response.ok) retry(events, attempt);
          else {
            sent += events.length;
            lastFlush = new Date().toISOString();
          }
        })
        .catch(() => retry(events, attempt));
    } catch {
      retry(events, attempt);
    }
  };

  const flush = (): void => {
    try {
      for (const batch of queue.drainBatches(
        (events) => JSON.stringify({ events }),
        BODY_MAX,
      )) {
        deliver(batch);
      }
    } catch {
      // Delivery is best-effort.
    }
  };

  const enqueue = (event: TrackedEvent): void => {
    queue.push(event);
    if (queue.length >= FLUSH_AT) flush();
  };

  const pageView = (): void =>
    enqueue({
      eid: createUuid(win),
      session_id: sessions.ensure(),
      type: 'page_view',
      url: win.location.href,
      ts: new Date().toISOString(),
      vw: win.innerWidth,
      vh: win.innerHeight,
    });

  const trackPath = (): void => {
    try {
      const next = normalizePath(win.location.href);
      if (next !== lastPath) {
        lastPath = next;
        pageView();
      }
    } catch {
      // History instrumentation must not interfere with its host.
    }
  };

  const start = (): void => {
    if (started) return;
    started = true;
    pageView();
    doc.addEventListener(
      'click',
      (event) => {
        try {
          if (
            !event.isTrusted ||
            (event.detail === 0 && event.pageX === 0 && event.pageY === 0)
          )
            return;
          const target = event.composedPath()[0] ?? event.target;
          enqueue({
            eid: createUuid(win),
            session_id: sessions.ensure(),
            type: 'click',
            url: win.location.href,
            ts: new Date().toISOString(),
            vw: win.innerWidth,
            vh: win.innerHeight,
            x: event.pageX,
            y: event.pageY,
            doc_w: doc.documentElement.scrollWidth,
            doc_h: doc.documentElement.scrollHeight,
            sel: buildSelector(target),
          });
        } catch {
          // Click tracking must not interfere with its host.
        }
      },
      true,
    );
    for (const method of ['pushState', 'replaceState'] as const) {
      const original = win.history[method];
      win.history[method] = function (
        ...args: Parameters<History[typeof method]>
      ) {
        const result = original.apply(this, args);
        trackPath();
        return result;
      };
    }
    win.addEventListener('popstate', trackPath);
    doc.addEventListener('visibilitychange', () => {
      try {
        if (doc.visibilityState === 'hidden') flush();
      } catch {}
    });
    win.addEventListener('pagehide', () => {
      try {
        flush();
      } catch {}
    });
    win.setInterval(() => {
      try {
        flush();
      } catch {}
    }, FLUSH_INTERVAL_MS);
  };

  const status: TrackerStatus = {
    get sessionId() {
      return sessions.peek();
    },
    get status() {
      return isPaused(win) ? 'paused' : 'active';
    },
    get eventsQueued() {
      return queue.length;
    },
    get eventsSent() {
      return sent;
    },
    get lastFlush() {
      return lastFlush;
    },
    enable() {
      enableTracking(win);
      start();
    },
  };
  Object.assign(win, { __cf: status });
  if (isPaused(win)) {
    // eslint-disable-next-line no-console -- privacy pause is intentionally visible.
    console.info('CausalFunnel tracking paused because DNT or GPC is enabled.');
    return;
  }
  start();
}
