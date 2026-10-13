import { describe, expect, it } from 'vitest';
import { bucketOf } from '../src/bucket-of.js';
import { normalizePath } from '../src/normalize-path.js';
import { resolveTs } from '../src/resolve-ts.js';

describe('normalizePath', () => {
  const cases: Array<{ input: string; expected: string | 'throws'; description: string }> = [
    {
      description: 'strips query and hash from path',
      input: 'https://demo.example.com/products?utm=1#top',
      expected: 'https://demo.example.com/products',
    },
    {
      description: 'strips trailing slash from path with segment',
      input: 'https://demo.example.com/products/',
      expected: 'https://demo.example.com/products',
    },
    {
      description: 'strips trailing slash from root origin',
      input: 'https://demo.example.com/',
      expected: 'https://demo.example.com',
    },
    {
      description: 'lowercases origin while preserving pathname casing',
      input: 'HTTPS://Demo.Example.com/Products',
      expected: 'https://demo.example.com/Products',
    },
    {
      description: 'preserves local demo URL with port and path',
      input: 'http://localhost:5173/demo/home.html',
      expected: 'http://localhost:5173/demo/home.html',
    },
    {
      description: 'throws on invalid URL string',
      input: 'not a url',
      expected: 'throws',
    },
  ];

  it.each(cases)('$description: normalizePath("$input")', ({ input, expected }) => {
    if (expected === 'throws') {
      expect(() => normalizePath(input)).toThrow();
    } else {
      expect(normalizePath(input)).toBe(expected);
    }
  });
});

describe('bucketOf', () => {
  const cases: Array<{ input: number; expected: 'mobile' | 'tablet' | 'desktop' }> = [
    { input: 389, expected: 'mobile' },
    { input: 767, expected: 'mobile' },
    { input: 768, expected: 'tablet' },
    { input: 1023, expected: 'tablet' },
    { input: 1024, expected: 'desktop' },
    { input: 1920, expected: 'desktop' },
  ];

  it.each(cases)('maps width $input to $expected', ({ input, expected }) => {
    expect(bucketOf(input)).toBe(expected);
  });
});

describe('resolveTs', () => {
  const receivedAt = new Date('2026-10-13T12:00:00.000Z');

  const cases: Array<{
    description: string;
    clientTs: string | Date | undefined | null;
    expected: Date;
  }> = [
    {
      description: 'within 24 hours of received (past)',
      clientTs: '2026-10-13T11:00:00.000Z',
      expected: new Date('2026-10-13T11:00:00.000Z'),
    },
    {
      description: 'within 24 hours of received (future)',
      clientTs: '2026-10-13T17:00:00.000Z',
      expected: new Date('2026-10-13T17:00:00.000Z'),
    },
    {
      description: 'exactly 24 hours away (past boundary)',
      clientTs: '2026-10-12T12:00:00.000Z',
      expected: new Date('2026-10-12T12:00:00.000Z'),
    },
    {
      description: 'exactly 24 hours away (future boundary)',
      clientTs: '2026-10-14T12:00:00.000Z',
      expected: new Date('2026-10-14T12:00:00.000Z'),
    },
    {
      description: 'more than 24 hours away in past (replaced with received)',
      clientTs: '2026-10-12T11:59:59.000Z',
      expected: receivedAt,
    },
    {
      description: 'more than 24 hours away in future (replaced with received)',
      clientTs: '2026-10-14T12:00:01.000Z',
      expected: receivedAt,
    },
    {
      description: 'missing client timestamp (undefined)',
      clientTs: undefined,
      expected: receivedAt,
    },
    {
      description: 'missing client timestamp (null)',
      clientTs: null,
      expected: receivedAt,
    },
    {
      description: 'invalid client timestamp (non-date string)',
      clientTs: 'not a date',
      expected: receivedAt,
    },
  ];

  it.each(cases)('$description', ({ clientTs, expected }) => {
    const result = resolveTs(clientTs, receivedAt);
    expect(result.getTime()).toBe(expected.getTime());
  });
});
