import { describe, expect, it } from 'vitest';
import { scalePoint } from '../src/math.js';

describe('Heatmap coordinate math', () => {
  it('scales (640, 912, doc_w 1280) at width 1280 to (640, 912)', () => {
    const result = scalePoint(
      { x: 640, y: 912, doc_w: 1280, doc_h: 1200 },
      1280,
    );
    expect(result).toEqual({ px: 640, py: 912 });
  });

  it('scales (640, 912, doc_w 1280) at width 640 to (320, 456)', () => {
    const result = scalePoint(
      { x: 640, y: 912, doc_w: 1280, doc_h: 1200 },
      640,
    );
    expect(result).toEqual({ px: 320, py: 456 });
  });

  it('scales (640, 912, doc_w 2560) at width 1280 to (320, 456)', () => {
    const result = scalePoint(
      { x: 640, y: 912, doc_w: 2560, doc_h: 2400 },
      1280,
    );
    expect(result).toEqual({ px: 320, py: 456 });
  });

  it('rejects zero or negative doc_w without dividing by zero', () => {
    expect(() =>
      scalePoint({ x: 100, y: 100, doc_w: 0, doc_h: 800 }, 1280),
    ).toThrow(/Invalid doc_w/);
    expect(() =>
      scalePoint({ x: 100, y: 100, doc_w: -100, doc_h: 800 }, 1280),
    ).toThrow(/Invalid doc_w/);
  });

  it('scales Y independently when renderHeight is provided', () => {
    const result = scalePoint(
      { x: 660, y: 621, doc_w: 1536, doc_h: 776 },
      1280,
      1200,
    );
    expect(result.px).toBe(Math.round(660 * (1280 / 1536)));
    expect(result.py).toBe(Math.round(621 * (1200 / 776)));
  });

  it('falls back to X scale when renderHeight is omitted', () => {
    const result = scalePoint(
      { x: 660, y: 621, doc_w: 1536, doc_h: 776 },
      1280,
    );
    const scale = 1280 / 1536;
    expect(result.px).toBe(Math.round(660 * scale));
    expect(result.py).toBe(Math.round(621 * scale));
  });
});
