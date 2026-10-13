import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer, type TestServerInstance } from './test-helper.js';

describe('Sessions list endpoint', () => {
  let instance: TestServerInstance;

  // Session IDs
  const sessionClickFirst = '11111111-1111-4111-8111-111111111111';
  const sessionBig = '22222222-2222-4222-8222-222222222222';
  const sessionNewest = '33333333-3333-4333-8333-333333333333';

  beforeAll(async () => {
    instance = await startTestServer();

    // 1. Session Click First: earliest event is a click at 10:00:00, second is page_view at 10:00:05
    const clickFirstEvents = [
      {
        eid: 'e1000000-0000-4000-8000-000000000001',
        session_id: sessionClickFirst,
        type: 'click',
        url: 'https://demo.example.com/click-first',
        path: 'https://demo.example.com/click-first',
        ts: new Date('2026-10-13T10:00:00.000Z'),
        received_at: new Date('2026-10-13T10:00:00.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
        x: 100,
        y: 200,
        doc_w: 1280,
        doc_h: 2000,
      },
      {
        eid: 'e1000000-0000-4000-8000-000000000002',
        session_id: sessionClickFirst,
        type: 'page_view',
        url: 'https://demo.example.com/later-page',
        path: 'https://demo.example.com/later-page',
        ts: new Date('2026-10-13T10:00:05.000Z'),
        received_at: new Date('2026-10-13T10:00:05.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
      },
    ];

    // 2. Session Big: 25 events from 11:00:00 to 11:00:24
    const bigEvents = Array.from({ length: 25 }, (_, i) => ({
      eid: `e2000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      session_id: sessionBig,
      type: 'page_view',
      url: 'https://demo.example.com/big-session',
      path: 'https://demo.example.com/big-session',
      ts: new Date(new Date('2026-10-13T11:00:00.000Z').getTime() + i * 1000),
      received_at: new Date('2026-10-13T11:00:00.000Z'),
      src: 'live',
      vw: 1280,
      vh: 800,
      vw_bucket: 'desktop',
    }));

    // 3. Session Newest: 1 event with the newest timestamp at 12:00:00
    const newestEvents = [
      {
        eid: 'e3000000-0000-4000-8000-000000000001',
        session_id: sessionNewest,
        type: 'page_view',
        url: 'https://demo.example.com/newest',
        path: 'https://demo.example.com/newest',
        ts: new Date('2026-10-13T12:00:00.000Z'),
        received_at: new Date('2026-10-13T12:00:00.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
      },
    ];

    await instance.db
      .collection('events')
      .insertMany([...clickFirstEvents, ...bigEvents, ...newestEvents], {
        ordered: false,
      });
  });

  afterAll(async () => {
    if (instance) {
      await instance.cleanup();
    }
  });

  it('returns sessions ordered by newest last_seen first', async () => {
    const res = await fetch(`${instance.baseUrl}/api/sessions`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.total).toBe(3);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
    expect(body.data.length).toBe(3);

    // Newest last_seen (12:00:00) should be first
    expect(body.data[0].session_id).toBe(sessionNewest);
    // Second newest last_seen (11:00:24) should be second
    expect(body.data[1].session_id).toBe(sessionBig);
    // Oldest last_seen (10:00:05) should be third
    expect(body.data[2].session_id).toBe(sessionClickFirst);
  });

  it('session whose first event is a click correctly takes entry_path from that click', async () => {
    const res = await fetch(`${instance.baseUrl}/api/sessions`);
    expect(res.status).toBe(200);
    const body = await res.json();

    const clickFirst = body.data.find(
      (s: { session_id: string }) => s.session_id === sessionClickFirst,
    );
    expect(clickFirst).toBeDefined();
    expect(clickFirst.event_count).toBe(2);
    expect(clickFirst.entry_path).toBe('https://demo.example.com/click-first');
    expect(new Date(clickFirst.first_seen).toISOString()).toBe(
      '2026-10-13T10:00:00.000Z',
    );
    expect(new Date(clickFirst.last_seen).toISOString()).toBe(
      '2026-10-13T10:00:05.000Z',
    );
  });

  it('correctly reports event_count for 25-event session', async () => {
    const res = await fetch(`${instance.baseUrl}/api/sessions`);
    expect(res.status).toBe(200);
    const body = await res.json();

    const big = body.data.find(
      (s: { session_id: string }) => s.session_id === sessionBig,
    );
    expect(big).toBeDefined();
    expect(big.event_count).toBe(25);
    expect(new Date(big.first_seen).toISOString()).toBe(
      '2026-10-13T11:00:00.000Z',
    );
    expect(new Date(big.last_seen).toISOString()).toBe(
      '2026-10-13T11:00:24.000Z',
    );
  });

  it('supports pagination with page and limit parameters', async () => {
    const resPage1 = await fetch(
      `${instance.baseUrl}/api/sessions?page=1&limit=2`,
    );
    expect(resPage1.status).toBe(200);
    const bodyPage1 = await resPage1.json();
    expect(bodyPage1.data.length).toBe(2);
    expect(bodyPage1.total).toBe(3);
    expect(bodyPage1.page).toBe(1);
    expect(bodyPage1.limit).toBe(2);
    expect(bodyPage1.data[0].session_id).toBe(sessionNewest);
    expect(bodyPage1.data[1].session_id).toBe(sessionBig);

    const resPage2 = await fetch(
      `${instance.baseUrl}/api/sessions?page=2&limit=2`,
    );
    expect(resPage2.status).toBe(200);
    const bodyPage2 = await resPage2.json();
    expect(bodyPage2.data.length).toBe(1);
    expect(bodyPage2.total).toBe(3);
    expect(bodyPage2.page).toBe(2);
    expect(bodyPage2.limit).toBe(2);
    expect(bodyPage2.data[0].session_id).toBe(sessionClickFirst);
  });

  it('uses _id as deterministic tie-break for identical last_seen timestamps', async () => {
    // Both sessions will have identical last_seen, differing only by _id
    const tieServer = await startTestServer();
    try {
      const sameTs = new Date('2026-10-13T15:00:00.000Z');
      await tieServer.db.collection('events').insertMany([
        {
          _id: 'aaaa11112222333344445555',
          eid: 'e9000000-0000-4000-8000-000000000001',
          session_id: 'session-bbb',
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
          _id: '000011112222333344445555',
          eid: 'e9000000-0000-4000-8000-000000000002',
          session_id: 'session-aaa',
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

      const res = await fetch(`${tieServer.baseUrl}/api/sessions`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBe(2);
      // _id: 1 tie break places session-aaa ('0000...') before session-bbb ('aaaa...')
      expect(body.data[0].session_id).toBe('session-aaa');
      expect(body.data[1].session_id).toBe('session-bbb');
    } finally {
      await tieServer.cleanup();
    }
  });
});
