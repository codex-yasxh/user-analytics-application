import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REFERENCE_WIDTH } from '@cf/shared';
import { startTestServer, type TestServerInstance } from './test-helper.js';

describe('GET /api/heatmap', () => {
  let instance: TestServerInstance;

  const testPath = 'https://demo.example.com/products';

  beforeAll(async () => {
    instance = await startTestServer();

    await instance.db.collection('events').insertMany([
      // Desktop click 1 (older: 10:00:00)
      {
        eid: 'eh000000-0000-4000-8000-000000000001',
        session_id: '11111111-1111-4111-8111-111111111111',
        type: 'click',
        url: `${testPath}?ref=1`,
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
      },
      // Desktop click 2 (newer: 10:00:10)
      {
        eid: 'eh000000-0000-4000-8000-000000000002',
        session_id: '11111111-1111-4111-8111-111111111111',
        type: 'click',
        url: `${testPath}?ref=2`,
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
      },
      // Mobile click on same path (should not appear in desktop heatmap)
      {
        eid: 'eh000000-0000-4000-8000-000000000003',
        session_id: '22222222-2222-4222-8222-222222222222',
        type: 'click',
        url: testPath,
        path: testPath,
        ts: new Date('2026-10-13T10:00:20.000Z'),
        received_at: new Date('2026-10-13T10:00:20.000Z'),
        src: 'live',
        vw: 390,
        vh: 844,
        vw_bucket: 'mobile',
        x: 50,
        y: 80,
        doc_w: 390,
        doc_h: 1500,
      },
      // Page view on same path (should not be included in clicks)
      {
        eid: 'eh000000-0000-4000-8000-000000000004',
        session_id: '11111111-1111-4111-8111-111111111111',
        type: 'page_view',
        url: testPath,
        path: testPath,
        ts: new Date('2026-10-13T10:00:05.000Z'),
        received_at: new Date('2026-10-13T10:00:05.000Z'),
        src: 'live',
        vw: 1280,
        vh: 800,
        vw_bucket: 'desktop',
      },
    ]);
  });

  afterAll(async () => {
    if (instance) {
      await instance.cleanup();
    }
  });

  it('requires a valid path query parameter', async () => {
    const missingRes = await fetch(`${instance.baseUrl}/api/heatmap`);
    expect(missingRes.status).toBe(400);
    const missingBody = await missingRes.json();
    expect(missingBody.error.code).toBe('INVALID_PATH');

    const invalidRes = await fetch(
      `${instance.baseUrl}/api/heatmap?path=javascript:alert(1)`,
    );
    expect(invalidRes.status).toBe(400);
    const invalidBody = await invalidRes.json();
    expect(invalidBody.error.code).toBe('INVALID_PATH');
  });

  it('normalizes trailing slash and query string so path/?utm=1 matches normalized stored path', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/heatmap?path=${encodeURIComponent(`${testPath}/?utm_source=ad#section`)}`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.path).toBe(testPath);
    expect(body.total).toBe(2);
    expect(body.returned).toBe(2);
    expect(body.points.length).toBe(2);
  });

  it('returns desktop clicks newest first by default with correct reference width', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/heatmap?path=${encodeURIComponent(testPath)}`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.path).toBe(testPath);
    expect(body.bucket).toBe('desktop');
    expect(body.reference_width).toBe(REFERENCE_WIDTH.desktop);
    expect(body.total).toBe(2);
    expect(body.returned).toBe(2);

    // Newest click (10:00:10, x: 300, y: 400) should be first
    expect(body.points[0]).toEqual({
      x: 300,
      y: 400,
      doc_w: 1280,
      doc_h: 2000,
      vw: 1280,
      vh: 800,
    });
    // Older click (10:00:00, x: 100, y: 200) should be second
    expect(body.points[1]).toEqual({
      x: 100,
      y: 200,
      doc_w: 1280,
      doc_h: 2000,
      vw: 1280,
      vh: 800,
    });
  });

  it('filters by requested bucket and returns matching points only', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/heatmap?path=${encodeURIComponent(testPath)}&bucket=mobile`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.bucket).toBe('mobile');
    expect(body.reference_width).toBe(REFERENCE_WIDTH.mobile);
    expect(body.total).toBe(1);
    expect(body.returned).toBe(1);
    expect(body.points[0]).toEqual({
      x: 50,
      y: 80,
      doc_w: 390,
      doc_h: 1500,
      vw: 390,
      vh: 844,
    });
  });

  it('rejects an invalid bucket with 400 error shape', async () => {
    const res = await fetch(
      `${instance.baseUrl}/api/heatmap?path=${encodeURIComponent(testPath)}&bucket=smartwatch`,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: 'INVALID_BUCKET',
        message: 'Bucket must be mobile, tablet, or desktop',
      },
    });
  });

  it('rejects limit 6000 and limit 0 with 400 error shape', async () => {
    const res6000 = await fetch(
      `${instance.baseUrl}/api/heatmap?path=${encodeURIComponent(testPath)}&limit=6000`,
    );
    expect(res6000.status).toBe(400);
    const body6000 = await res6000.json();
    expect(body6000.error.code).toBe('INVALID_LIMIT');

    const res0 = await fetch(
      `${instance.baseUrl}/api/heatmap?path=${encodeURIComponent(testPath)}&limit=0`,
    );
    expect(res0.status).toBe(400);
    const body0 = await res0.json();
    expect(body0.error.code).toBe('INVALID_LIMIT');
  });

  it('heatmap query plan executes without a blocking SORT stage using heatmap_lookup index', async () => {
    const explain = await instance.db
      .collection('events')
      .find(
        { type: 'click', path: testPath, vw_bucket: 'desktop' },
        {
          projection: { _id: 0, x: 1, y: 1, doc_w: 1, doc_h: 1, vw: 1, vh: 1 },
        },
      )
      .sort({ ts: -1 })
      .limit(5000)
      .explain('queryPlanner');

    const winningPlan = (
      explain as {
        queryPlanner: {
          winningPlan: { stage: string; inputStage?: { stage: string } };
        };
      }
    ).queryPlanner.winningPlan;

    // Must not contain a blocking in-memory SORT stage
    expect(winningPlan.stage).not.toBe('SORT');
    expect(JSON.stringify(winningPlan)).not.toContain('"stage":"SORT"');
  });
});
