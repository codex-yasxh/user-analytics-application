import { describe, expect, it } from 'vitest';
import { scalePoint } from '../src/math.js';

describe('Heatmap coordinate math', () => {
  it('scales (640, 912, doc_w 1280) at width 1280 to (640, 912)', () => {
    const result = scalePoint({ x: 640, y: 912, doc_w: 1280 }, 1280);
    expect(result).toEqual({ px: 640, py: 912 });
  });

  it('scales (640, 912, doc_w 1280) at width 640 to (320, 456)', () => {
    const result = scalePoint({ x: 640, y: 912, doc_w: 1280 }, 640);
    expect(result).toEqual({ px: 320, py: 456 });
  });

  it('scales (640, 912, doc_w 2560) at width 1280 to (320, 456)', () => {
    const result = scalePoint({ x: 640, y: 912, doc_w: 2560 }, 1280);
    expect(result).toEqual({ px: 320, py: 456 });
  });

  it('rejects zero or negative doc_w without dividing by zero', () => {
    expect(() => scalePoint({ x: 100, y: 100, doc_w: 0 }, 1280)).toThrow(
      /Invalid doc_w/,
    );
    expect(() => scalePoint({ x: 100, y: 100, doc_w: -100 }, 1280)).toThrow(
      /Invalid doc_w/,
    );
  });
});
