import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer, type TestServerInstance } from './test-helper.js';

describe('GET /api/pages', () => {
  let instance: TestServerInstance;

  beforeAll(async () => {
    instance = await startTestServer();

    await instance.db.collection('events').insertMany([
      // Page 1: /products -> 1 view, 3 clicks
      {
        eid: 'ep000000-0000-4000-8000-000000000001',
        session_id: '11111111-1111-4111-8111-111111111111',
        type: 'page_view',
        url: 'https://demo.example.com/products',
        path: 'https://demo.example.com/products',
        ts: new Date('2026-10-13T10:00:00.000Z'),
        received_at: new Date('2026-10-13T10:00:00.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
      },
      {
        eid: 'ep000000-0000-4000-8000-000000000002',
        session_id: '11111111-1111-4111-8111-111111111111',
        type: 'click',
        url: 'https://demo.example.com/products',
        path: 'https://demo.example.com/products',
        ts: new Date('2026-10-13T10:00:02.000Z'),
        received_at: new Date('2026-10-13T10:00:02.000Z'),
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
        eid: 'ep000000-0000-4000-8000-000000000003',
        session_id: '11111111-1111-4111-8111-111111111111',
        type: 'click',
        url: 'https://demo.example.com/products',
        path: 'https://demo.example.com/products',
        ts: new Date('2026-10-13T10:00:03.000Z'),
        received_at: new Date('2026-10-13T10:00:03.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
        x: 120,
        y: 220,
        doc_w: 1280,
        doc_h: 2000,
      },
      {
        eid: 'ep000000-0000-4000-8000-000000000004',
        session_id: '11111111-1111-4111-8111-111111111111',
        type: 'click',
        url: 'https://demo.example.com/products',
        path: 'https://demo.example.com/products',
        ts: new Date('2026-10-13T10:00:04.000Z'),
        received_at: new Date('2026-10-13T10:00:04.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
        x: 130,
        y: 230,
        doc_w: 1280,
        doc_h: 2000,
      },
      // Page 2: /about -> 5 views, 1 click
      {
        eid: 'ep000000-0000-4000-8000-000000000005',
        session_id: '22222222-2222-4222-8222-222222222222',
        type: 'page_view',
        url: 'https://demo.example.com/about',
        path: 'https://demo.example.com/about',
        ts: new Date('2026-10-13T10:01:00.000Z'),
        received_at: new Date('2026-10-13T10:01:00.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
      },
      {
        eid: 'ep000000-0000-4000-8000-000000000006',
        session_id: '22222222-2222-4222-8222-222222222222',
        type: 'click',
        url: 'https://demo.example.com/about',
        path: 'https://demo.example.com/about',
        ts: new Date('2026-10-13T10:01:05.000Z'),
        received_at: new Date('2026-10-13T10:01:05.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
        x: 300,
        y: 400,
        doc_w: 1280,
        doc_h: 2000,
      },
    ]);
  });

  afterAll(async () => {
    if (instance) {
      await instance.cleanup();
    }
  });

  it('returns aggregated page metrics ordered by most clicks first', async () => {
    const res = await fetch(`${instance.baseUrl}/api/pages`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);

    // /products has 3 clicks, should be first
    expect(body[0]).toEqual({
      path: 'https://demo.example.com/products',
      views: 1,
      clicks: 3,
    });

    // /about has 1 click, should be second
    expect(body[1]).toEqual({
      path: 'https://demo.example.com/about',
      views: 1,
      clicks: 1,
    });
  });
});
