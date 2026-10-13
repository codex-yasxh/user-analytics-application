import {
  bucketOf,
  eventSchema,
  normalizePath,
  resolveTs,
  type StoredEvent,
} from '@cf/shared';

export interface BuildDocsResult {
  docs: StoredEvent[];
  rejected: number;
}

/**
 * Transforms raw untrusted events into validated, enriched stored documents.
 * Pure function with no side effects or external I/O.
 */
export function buildDocs(
  rawEvents: readonly unknown[],
  received: Date,
): BuildDocsResult {
  const docs: StoredEvent[] = [];
  let rejected = 0;

  for (const raw of rawEvents) {
    const parsed = eventSchema.safeParse(raw);
    if (!parsed.success) {
      rejected += 1;
      continue;
    }

    const event = parsed.data;
    const base = {
      eid: event.eid,
      session_id: event.session_id,
      url: event.url,
      path: normalizePath(event.url),
      ts: resolveTs(event.ts, received),
      received_at: received,
      src: 'live' as const,
      vw: event.vw,
      vh: event.vh,
      vw_bucket: bucketOf(event.vw),
    };

    if (event.type === 'page_view') {
      docs.push({
        ...base,
        type: 'page_view',
      });
    } else {
      docs.push({
        ...base,
        type: 'click',
        x: event.x,
        y: event.y,
        doc_w: event.doc_w,
        doc_h: event.doc_h,
        ...(event.sel !== undefined ? { sel: event.sel } : {}),
      });
    }
  }

  return { docs, rejected };
}
