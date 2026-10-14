import { describe, expect, it } from 'vitest';
import { classifyResponse } from '../src/api.js';

describe('Response classifier', () => {
  it('classifies 200 with application/json as ok', () => {
    expect(classifyResponse(200, 'application/json', 100)).toBe('ok');
    expect(classifyResponse(200, 'application/json; charset=utf-8', 500)).toBe(
      'ok',
    );
  });

  it('classifies 200 with non-json (HTML or text) as waking (e.g. cold start gateway page)', () => {
    expect(classifyResponse(200, 'text/html', 200)).toBe('waking');
    expect(classifyResponse(200, null, 200)).toBe('waking');
  });

  it('classifies 5xx as waking', () => {
    expect(classifyResponse(500, 'application/json', 200)).toBe('waking');
    expect(classifyResponse(502, 'text/html', 200)).toBe('waking');
    expect(classifyResponse(503, 'application/json', 200)).toBe('waking');
    expect(classifyResponse(504, 'text/plain', 200)).toBe('waking');
  });

  it('classifies elapsed time >= 8000ms as waking', () => {
    expect(classifyResponse(200, 'application/json', 8000)).toBe('waking');
    expect(classifyResponse(200, 'application/json', 12000)).toBe('waking');
  });

  it('classifies 4xx client errors as error', () => {
    expect(classifyResponse(400, 'application/json', 100)).toBe('error');
    expect(classifyResponse(404, 'application/json', 100)).toBe('error');
    expect(classifyResponse(403, 'application/json', 100)).toBe('error');
  });
});
