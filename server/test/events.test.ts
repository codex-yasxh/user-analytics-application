import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer, type TestServerInstance } from './test-helper.js';

describe('Events ingestion endpoint', () => {
  const fixturesDir = resolve(import.meta.dirname, '../../fixtures');
  let instance: TestServerInstance;

  beforeAll(async () => {
    instance = await startTestServer();
  });

  afterAll(async () => {
    if (instance) {
      await instance.cleanup();
    }
  });

  it('first send of valid batch returns accepted: 2, duplicates: 0, rejected: 0', async () => {
    const raw = readFileSync(resolve(fixturesDir, 'batch-valid.json'), 'utf-8');
    const res = await fetch(`${instance.baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: raw,
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toEqual({
      accepted: 2,
      duplicates: 0,
      rejected: 0,
    });

    const count = await instance.db.collection('events').countDocuments();
    expect(count).toBe(2);
  });

  it('second send of valid batch returns accepted: 0, duplicates: 2, rejected: 0 and count is unchanged', async () => {
    const raw = readFileSync(resolve(fixturesDir, 'batch-valid.json'), 'utf-8');
    const res = await fetch(`${instance.baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: raw,
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toEqual({
      accepted: 0,
      duplicates: 2,
      rejected: 0,
    });

    const count = await instance.db.collection('events').countDocuments();
    expect(count).toBe(2);
  });

  it('mixed batch returns accepted: 2, duplicates: 0, rejected: 1', async () => {
    const raw = readFileSync(resolve(fixturesDir, 'batch-mixed.json'), 'utf-8');
    const res = await fetch(`${instance.baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: raw,
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toEqual({
      accepted: 2,
      duplicates: 0,
      rejected: 1,
    });

    const count = await instance.db.collection('events').countDocuments();
    expect(count).toBe(4);
  });

  it('unordered insert continues inserting remaining events after encountering a duplicate', async () => {
    const payload = JSON.stringify({
      events: [
        {
          eid: '3f2b8c1e-9d4a-4e7b-8a1c-5d6e7f8091a2',
          session_id: 'b7c1e5a2-3d94-4f06-8b2a-9e1d7c3a5f48',
          type: 'page_view',
          url: 'https://demo.example.com/',
          vw: 1280,
          vh: 800,
        },
        {
          eid: '99999999-9999-4999-8999-999999999999',
          session_id: 'b7c1e5a2-3d94-4f06-8b2a-9e1d7c3a5f48',
          type: 'page_view',
          url: 'https://demo.example.com/',
          vw: 1280,
          vh: 800,
        },
      ],
    });

    const res = await fetch(`${instance.baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toEqual({
      accepted: 1,
      duplicates: 1,
      rejected: 0,
    });
  });

  it('accepts text/plain Content-Type with valid JSON string', async () => {
    const payload = JSON.stringify({
      events: [
        {
          eid: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
          session_id: 'b7c1e5a2-3d94-4f06-8b2a-9e1d7c3a5f48',
          type: 'page_view',
          url: 'https://demo.example.com/text-plain',
          vw: 1280,
          vh: 800,
        },
      ],
    });

    const res = await fetch(`${instance.baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: payload,
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toEqual({
      accepted: 1,
      duplicates: 0,
      rejected: 0,
    });
  });

  it('a batch with 51 events returns 400 BAD_REQUEST', async () => {
    const baseEvent = {
      session_id: 'b7c1e5a2-3d94-4f06-8b2a-9e1d7c3a5f48',
      type: 'page_view',
      url: 'https://demo.example.com/',
      vw: 1280,
      vh: 800,
    };
    const events = Array.from({ length: 51 }, (_, i) => ({
      ...baseEvent,
      eid: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    }));

    const res = await fetch(`${instance.baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('a garbage unparseable body returns 400 BAD_REQUEST', async () => {
    const res = await fetch(`${instance.baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: 'this-is-not-valid-json',
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('empty envelope events array returns 400 BAD_REQUEST', async () => {
    const res = await fetch(`${instance.baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: [] }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('when INGEST_ENABLED is false returns 503 INGEST_DISABLED', async () => {
    const disabledServer = await startTestServer({ INGEST_ENABLED: false });
    try {
      const raw = readFileSync(resolve(fixturesDir, 'batch-valid.json'), 'utf-8');
      const res = await fetch(`${disabledServer.baseUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: raw,
      });

      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body).toEqual({
        error: {
          code: 'INGEST_DISABLED',
          message: 'Event ingestion is currently disabled',
        },
      });
    } finally {
      await disabledServer.cleanup();
    }
  });

  it('rate limiting uses distinct buckets per X-Forwarded-For IP address', async () => {
    const limitedServer = await startTestServer({ RATE_LIMIT_ENABLED: true });
    try {
      const validPayload = JSON.stringify({
        events: [
          {
            eid: 'f1e2d3c4-b5a6-4978-8123-456789abcdef',
            session_id: 'b7c1e5a2-3d94-4f06-8b2a-9e1d7c3a5f48',
            type: 'page_view',
            url: 'https://demo.example.com/',
            vw: 1280,
            vh: 800,
          },
        ],
      });

      // Request from IP A
      const resA = await fetch(`${limitedServer.baseUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.10',
        },
        body: validPayload,
      });
      expect(resA.status).toBe(202);

      // Request from IP B
      const resB = await fetch(`${limitedServer.baseUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '203.0.113.50',
        },
        body: validPayload,
      });
      // Second request has duplicate eid so it responds 202 with duplicates: 1, not rate limited
      expect(resB.status).toBe(202);
      const bodyB = await resB.json();
      expect(bodyB.duplicates).toBe(1);
    } finally {
      await limitedServer.cleanup();
    }
  });

  it('oversized body (>100KB) returns 400 or 413 in standard error shape', async () => {
    const bigString = 'x'.repeat(105 * 1024);
    const res = await fetch(`${instance.baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: bigString,
    });

    expect([400, 413]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
  });
});
