import { describe, expect, it } from 'vitest';
import { batchEnvelopeSchema, eventSchema } from '../src/schema.js';

describe('eventSchema', () => {
  const validPageView = {
    eid: '3f2b8c1e-9d4a-4e7b-8a1c-5d6e7f8091a2',
    session_id: 'a81f2943-6c0d-4b5e-9f27-3d1c8e5a7b90',
    type: 'page_view',
    url: 'https://demo.example.com/products?utm_source=ad#top',
    ts: '2026-10-13T06:00:00.000Z',
    vw: 1280,
    vh: 800,
  };

  const validClick = {
    eid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    session_id: 'a81f2943-6c0d-4b5e-9f27-3d1c8e5a7b90',
    type: 'click',
    url: 'https://demo.example.com/products?utm_source=ad#top',
    ts: '2026-10-13T06:00:05.000Z',
    vw: 1280,
    vh: 800,
    x: 640,
    y: 912,
    doc_w: 1280,
    doc_h: 2400,
    sel: 'button.add-to-cart',
  };

  const invalidEvent = {
    eid: 'e2cab5f4-7d30-4e9c-b051-4a0d8c6e3b29',
    session_id: 'b7c1e5a2-3d94-4f06-8b2a-9e1d7c3a5f48',
    type: 'hover',
    url: 'javascript:alert(1)',
    ts: '2026-10-13T06:10:04.000Z',
    vh: 844,
  };

  it('parses valid page_view event from fixtures', () => {
    const result = eventSchema.safeParse(validPageView);
    expect(result.success).toBe(true);
  });

  it('parses valid click event from fixtures', () => {
    const result = eventSchema.safeParse(validClick);
    expect(result.success).toBe(true);
  });

  it('strips unknown keys from events', () => {
    const withExtra = { ...validPageView, unexpectedField: 'remove-me' };
    const result = eventSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      expect('unexpectedField' in result.data).toBe(false);
    }
  });

  it('fails on invalid fixture event (unknown type, javascript url, missing vw)', () => {
    const result = eventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('fails on a click event without x coordinate', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { x, ...clickWithoutX } = validClick;
    const result = eventSchema.safeParse(clickWithoutX);
    expect(result.success).toBe(false);
  });

  it('fails on javascript: URL scheme', () => {
    const eventWithJsUrl = {
      ...validPageView,
      url: 'javascript:alert(1)',
    };
    const result = eventSchema.safeParse(eventWithJsUrl);
    expect(result.success).toBe(false);
  });

  it('fails when vw is 0 (must be positive and finite)', () => {
    const eventWithZeroVw = {
      ...validPageView,
      vw: 0,
    };
    const result = eventSchema.safeParse(eventWithZeroVw);
    expect(result.success).toBe(false);
  });
});

describe('batchEnvelopeSchema', () => {
  it('parses envelope with 1 to 50 items', () => {
    const validBatch = {
      events: [{ id: 1 }, { id: 2 }],
    };
    expect(batchEnvelopeSchema.safeParse(validBatch).success).toBe(true);
  });

  it('fails on empty envelope (0 items)', () => {
    const emptyBatch = { events: [] };
    const result = batchEnvelopeSchema.safeParse(emptyBatch);
    expect(result.success).toBe(false);
  });

  it('fails on 51-event envelope (exceeds MAX_BATCH)', () => {
    const oversizedBatch = {
      events: Array.from({ length: 51 }, (_, i) => ({ id: i })),
    };
    const result = batchEnvelopeSchema.safeParse(oversizedBatch);
    expect(result.success).toBe(false);
  });
});
