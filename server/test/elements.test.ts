import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer, type TestServerInstance } from './test-helper.js';

describe('GET /api/elements', () => {
  let instance: TestServerInstance;

  const testPath = 'https://demo.example.com/products';

  beforeAll(async () => {
    instance = await startTestServer();

    await instance.db.collection('events').insertMany([
      {
        eid: 'ee000000-0000-4000-8000-000000000001',
        session_id: '11111111-1111-4111-8111-111111111111',
        type: 'click',
        url: testPath,
        path: testPath,
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
        sel: 'button.add-to-cart',
      },
      {
        eid: 'ee000000-0000-4000-8000-000000000002',
        session_id: '11111111-1111-4111-8111-111111111111',
        type: 'click',
        url: testPath,
        path: testPath,
        ts: new Date('2026-10-13T10:00:10.000Z'),
        received_at: new Date('2026-10-13T10:00:10.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
        x: 300,
        y: 400,
        doc_w: 1280,
        doc_h: 2000,
        sel: 'button.add-to-cart',
      },
      {
        eid: 'ee000000-0000-4000-8000-000000000003',
        session_id: '11111111-1111-4111-8111-111111111111',
        type: 'click',
        url: testPath,
        path: testPath,
        ts: new Date('2026-10-13T10:00:20.000Z'),
        received_at: new Date('2026-10-13T10:00:20.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
        x: 500,
        y: 100,
        doc_w: 1280,
        doc_h: 2000,
        sel: 'a.product-link',
      },
      // Click without sel (should be excluded)
      {
        eid: 'ee000000-0000-4000-8000-000000000004',
        session_id: '11111111-1111-4111-8111-111111111111',
        type: 'click',
        url: testPath,
        path: testPath,
        ts: new Date('2026-10-13T10:00:30.000Z'),
        received_at: new Date('2026-10-13T10:00:30.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
        x: 10,
        y: 10,
        doc_w: 1280,
        doc_h: 2000,
      },
      // Mobile click (should not appear in desktop query)
      {
        eid: 'ee000000-0000-4000-8000-000000000005',
        session_id: '22222222-2222-4222-8222-222222222222',
        type: 'click',
        url: testPath,
        path: testPath,
        ts: new Date('2026-10-13T10:00:40.000Z'),
        received_at: new Date('2026-10-13T10:00:40.000Z'),
        src: 'live',
        vw: 390,
        vh: 844,
        vw_bucket: 'mobile',
        x: 50,
        y: 80,
        doc_w: 390,
        doc_h: 1500,
        sel: 'button.mobile-menu',
      },
    ]);
  });

  afterAll(async () => {
    if (instance) {
      await instance.cleanup();
    }
  });

  it('requires a valid path query parameter', async () => {
    const missingRes = await fetch(`${instance.baseUrl}/api/elements`);
    expect(missingRes.status).toBe(400);
    const missingBody = await missingRes.json();
    expect(missingBody.error.code).toBe('INVALID_PATH');
  });

  it('returns top-clicked elements grouped by selector, sorted by count desc', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/elements?path=${encodeURIComponent(testPath)}`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.path).toBe(testPath);
    expect(body.bucket).toBe('desktop');
    expect(body.elements).toHaveLength(2);
    expect(body.elements[0]).toEqual({ sel: 'button.add-to-cart', count: 2 });
    expect(body.elements[1]).toEqual({ sel: 'a.product-link', count: 1 });
  });

  it('filters by bucket', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/elements?path=${encodeURIComponent(testPath)}&bucket=mobile`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.bucket).toBe('mobile');
    expect(body.elements).toHaveLength(1);
    expect(body.elements[0]).toEqual({ sel: 'button.mobile-menu', count: 1 });
  });

  it('rejects invalid bucket', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/elements?path=${encodeURIComponent(testPath)}&bucket=smartwatch`,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_BUCKET');
  });

  it('respects limit parameter', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/elements?path=${encodeURIComponent(testPath)}&limit=1`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.elements).toHaveLength(1);
    expect(body.elements[0].sel).toBe('button.add-to-cart');
  });

  it('rejects invalid limit', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/elements?path=${encodeURIComponent(testPath)}&limit=0`,
    );
    expect(res.status).toBe(400);

    const res2 = await fetch(
      `${instance.baseUrl}/api/elements?path=${encodeURIComponent(testPath)}&limit=999`,
    );
    expect(res2.status).toBe(400);
  });

  it('excludes clicks without a sel field', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/elements?path=${encodeURIComponent(testPath)}`,
    );
    const body = await res.json();

    const selectors = body.elements.map((e: { sel: string }) => e.sel);
    expect(selectors).not.toContain(undefined);
    expect(selectors).not.toContain('');
  });
});
