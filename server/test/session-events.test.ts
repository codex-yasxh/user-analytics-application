import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JOURNEY_CAP } from '@cf/shared';
import { startTestServer, type TestServerInstance } from './test-helper.js';

describe('GET /api/sessions/:id/events', () => {
  let instance: TestServerInstance;

  const validSessionId = '44444444-4444-4444-8444-444444444444';
  const tieBreakSessionId = '55555555-5555-4555-8555-555555555555';
  const cappedSessionId = '66666666-6666-4666-8666-666666666666';
  const unknownSessionId = '77777777-7777-4777-8777-777777777777';

  beforeAll(async () => {
    instance = await startTestServer();

    // 1. Normal session: 3 events in different chronological order
    const events = [
      {
        _id: '100000000000000000000002',
        eid: 'e4000000-0000-4000-8000-000000000002',
        session_id: validSessionId,
        type: 'click',
        url: 'https://demo.example.com/item',
        path: 'https://demo.example.com/item',
        ts: new Date('2026-10-13T10:00:10.000Z'),
        received_at: new Date('2026-10-13T10:00:10.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
        x: 150,
        y: 250,
        doc_w: 1280,
        doc_h: 2000,
        sel: 'button.buy',
      },
      {
        _id: '100000000000000000000001',
        eid: 'e4000000-0000-4000-8000-000000000001',
        session_id: validSessionId,
        type: 'page_view',
        url: 'https://demo.example.com/item',
        path: 'https://demo.example.com/item',
        ts: new Date('2026-10-13T10:00:00.000Z'),
        received_at: new Date('2026-10-13T10:00:00.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
      },
      {
        _id: '100000000000000000000003',
        eid: 'e4000000-0000-4000-8000-000000000003',
        session_id: validSessionId,
        type: 'click',
        url: 'https://demo.example.com/item',
        path: 'https://demo.example.com/item',
        ts: new Date('2026-10-13T10:00:20.000Z'),
        received_at: new Date('2026-10-13T10:00:20.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
        x: 200,
        y: 300,
        doc_w: 1280,
        doc_h: 2000,
      },
    ];

    // 2. Deterministic tie-break session: two events with identical ts
    // Insert 'zzzz...' first and 'aaaa...' second so natural order is 'zzzz...', but _id: 1 puts 'aaaa...' first
    const tieBreakEvents = [
      {
        _id: 'zzzz00000000000000000000',
        eid: 'e5000000-0000-4000-8000-000000000002',
        session_id: tieBreakSessionId,
        type: 'page_view',
        url: 'https://demo.example.com/',
        path: 'https://demo.example.com/',
        ts: new Date('2026-10-13T12:00:00.000Z'),
        received_at: new Date('2026-10-13T12:00:00.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
      },
      {
        _id: 'aaaa00000000000000000000',
        eid: 'e5000000-0000-4000-8000-000000000001',
        session_id: tieBreakSessionId,
        type: 'page_view',
        url: 'https://demo.example.com/',
        path: 'https://demo.example.com/',
        ts: new Date('2026-10-13T12:00:00.000Z'),
        received_at: new Date('2026-10-13T12:00:00.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
      },
    ];

    // 3. Capped session: 1005 events (> JOURNEY_CAP 1000)
    const baseTime = new Date('2026-10-13T00:00:00.000Z').getTime();
    const cappedEvents = Array.from({ length: 1005 }, (_, i) => ({
      _id: `cap_${String(i).padStart(6, '0')}`,
      eid: `ec000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      session_id: cappedSessionId,
      type: 'page_view',
      url: 'https://demo.example.com/capped',
      path: 'https://demo.example.com/capped',
      ts: new Date(baseTime + i * 1000),
      received_at: new Date(baseTime + i * 1000),
      src: 'live',
      vw: 1280,
      vh: 800,
      vw_bucket: 'desktop',
    }));

    await instance.db
      .collection('events')
      .insertMany([...events, ...tieBreakEvents, ...cappedEvents], {
        ordered: false,
      });
  });

  afterAll(async () => {
    if (instance) {
      await instance.cleanup();
    }
  });

  it('returns events sorted by ts then _id with truncated false', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/sessions/${validSessionId}/events`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.session_id).toBe(validSessionId);
    expect(body.truncated).toBe(false);
    expect(body.events.length).toBe(3);

    // Verify chronological ordering
    expect(body.events[0].eid).toBe('e4000000-0000-4000-8000-000000000001');
    expect(body.events[1].eid).toBe('e4000000-0000-4000-8000-000000000002');
    expect(body.events[2].eid).toBe('e4000000-0000-4000-8000-000000000003');

    // Verify _id is projected out
    expect(body.events[0]._id).toBeUndefined();
  });

  it('uses _id as deterministic tie-break for identical timestamps', async () => {
    const tieServer = await startTestServer();
    try {
      await tieServer.db.collection('events').dropIndex('session_ts_id');
      const sameTs = new Date('2026-10-13T12:00:00.000Z');
      await tieServer.db.collection('events').insertMany([
        {
          _id: 'zzzz00000000000000000000',
          eid: 'e5000000-0000-4000-8000-000000000002',
          session_id: tieBreakSessionId,
          type: 'page_view',
          url: 'https://demo.example.com/',
          path: 'https://demo.example.com/',
          ts: sameTs,
          received_at: sameTs,
          src: 'live',
          vw: 1280,
          vh: 800,
          vw_bucket: 'desktop',
        },
        {
          _id: 'aaaa00000000000000000000',
          eid: 'e5000000-0000-4000-8000-000000000001',
          session_id: tieBreakSessionId,
          type: 'page_view',
          url: 'https://demo.example.com/',
          path: 'https://demo.example.com/',
          ts: sameTs,
          received_at: sameTs,
          src: 'live',
          vw: 1280,
          vh: 800,
          vw_bucket: 'desktop',
        },
      ]);

      const res = await fetch(
        `${tieServer.baseUrl}/api/sessions/${tieBreakSessionId}/events`,
      );
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.events.length).toBe(2);
      expect(body.events[0].eid).toBe('e5000000-0000-4000-8000-000000000001');
      expect(body.events[1].eid).toBe('e5000000-0000-4000-8000-000000000002');
    } finally {
      await tieServer.cleanup();
    }
  });

  it('caps events at JOURNEY_CAP and sets truncated to true when count exceeds cap', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/sessions/${cappedSessionId}/events`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.session_id).toBe(cappedSessionId);
    expect(body.truncated).toBe(true);
    expect(body.events.length).toBe(JOURNEY_CAP);
    expect(body.events[0].eid).toBe('ec000000-0000-4000-8000-000000000000');
    expect(body.events[JOURNEY_CAP - 1].eid).toBe(
      `ec000000-0000-4000-8000-${String(JOURNEY_CAP - 1).padStart(12, '0')}`,
    );
  });

  it('returns 404 standard error shape for unknown session ID', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/sessions/${unknownSessionId}/events`,
    );
    expect(res.status).toBe(404);
    const body = await res.json();

    expect(body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Session not found',
      },
    });
  });

  it('returns 400 standard error shape for malformed session ID', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/sessions/not-a-valid-uuid/events`,
    );
    expect(res.status).toBe(400);
    const body = await res.json();

    expect(body).toEqual({
      error: {
        code: 'INVALID_SESSION_ID',
        message: 'Invalid session ID format. Expected a valid UUID v4.',
      },
    });
  });
});
