import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDocs } from '../src/services/build-docs.js';

describe('Pure buildDocs event transformation', () => {
  const fixturesDir = resolve(import.meta.dirname, '../../fixtures');

  it('mixed fixture yields 2 docs and 1 rejected', () => {
    const raw = readFileSync(resolve(fixturesDir, 'batch-mixed.json'), 'utf-8');
    const fixture = JSON.parse(raw) as { events: unknown[] };
    const received = new Date('2026-10-13T06:15:00.000Z');

    const result = buildDocs(fixture.events, received);

    expect(result.docs.length).toBe(2);
    expect(result.rejected).toBe(1);
    expect(result.docs[0].type).toBe('page_view');
    expect(result.docs[1].type).toBe('click');
  });

  it('path equals https://demo.example.com/products for valid batch', () => {
    const raw = readFileSync(resolve(fixturesDir, 'batch-valid.json'), 'utf-8');
    const fixture = JSON.parse(raw) as { events: unknown[] };
    const received = new Date('2026-10-13T06:15:00.000Z');

    const result = buildDocs(fixture.events, received);

    expect(result.docs.length).toBe(2);
    expect(result.rejected).toBe(0);
    for (const doc of result.docs) {
      expect(doc.path).toBe('https://demo.example.com/products');
    }
  });

  it('replaces an out-of-window ts with received timestamp', () => {
    const received = new Date('2026-10-13T12:00:00.000Z');
    // Timestamp skewed by 48 hours (> 24 hours window)
    const outOfWindowTs = '2026-10-11T10:00:00.000Z';
    const rawEvent = {
      eid: '3f2b8c1e-9d4a-4e7b-8a1c-5d6e7f8091a2',
      session_id: 'a81f2943-6c0d-4b5e-9f27-3d1c8e5a7b90',
      type: 'page_view',
      url: 'https://demo.example.com/products',
      ts: outOfWindowTs,
      vw: 1280,
      vh: 800,
    };

    const result = buildDocs([rawEvent], received);

    expect(result.docs.length).toBe(1);
    expect(result.rejected).toBe(0);
    expect(result.docs[0].ts.getTime()).toBe(received.getTime());
  });

  it('preserves an in-window ts', () => {
    const received = new Date('2026-10-13T12:00:00.000Z');
    const inWindowTs = '2026-10-13T11:59:00.000Z';
    const rawEvent = {
      eid: '3f2b8c1e-9d4a-4e7b-8a1c-5d6e7f8091a2',
      session_id: 'a81f2943-6c0d-4b5e-9f27-3d1c8e5a7b90',
      type: 'page_view',
      url: 'https://demo.example.com/products',
      ts: inWindowTs,
      vw: 1280,
      vh: 800,
    };

    const result = buildDocs([rawEvent], received);

    expect(result.docs.length).toBe(1);
    expect(result.docs[0].ts.getTime()).toBe(new Date(inWindowTs).getTime());
  });

  it('does not mutate input objects', () => {
    const rawEvent = Object.freeze({
      eid: '3f2b8c1e-9d4a-4e7b-8a1c-5d6e7f8091a2',
      session_id: 'a81f2943-6c0d-4b5e-9f27-3d1c8e5a7b90',
      type: 'page_view',
      url: 'https://demo.example.com/products',
      ts: '2026-10-13T06:00:00.000Z',
      vw: 1280,
      vh: 800,
    });
    const snapshotBefore = JSON.stringify(rawEvent);
    const received = new Date('2026-10-13T06:00:00.000Z');

    const result = buildDocs([rawEvent], received);

    expect(result.docs.length).toBe(1);
    expect(JSON.stringify(rawEvent)).toBe(snapshotBefore);
    expect(Object.isFrozen(rawEvent)).toBe(true);
  });

  it('sets src to live, sets received_at, and calculates vw_bucket', () => {
    const received = new Date('2026-10-13T06:00:00.000Z');
    const mobileEvent = {
      eid: 'c0a8f3d2-5b1e-4c7a-9d3f-2e8b6a4c1f07',
      session_id: 'b7c1e5a2-3d94-4f06-8b2a-9e1d7c3a5f48',
      type: 'page_view',
      url: 'https://demo.example.com/',
      ts: '2026-10-13T06:00:00.000Z',
      vw: 390,
      vh: 844,
    };

    const result = buildDocs([mobileEvent], received);

    expect(result.docs[0].src).toBe('live');
    expect(result.docs[0].received_at).toBe(received);
    expect(result.docs[0].vw_bucket).toBe('mobile');
  });
});
