import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { eventSchema } from '../src/schema.js';

describe('fixtures verification', () => {
  const fixturesDir = resolve(__dirname, '../../../fixtures');
  const apiFixturesDir = resolve(fixturesDir, 'api');

  it('valid batch: both events pass the schema', () => {
    const raw = readFileSync(resolve(fixturesDir, 'batch-valid.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { events: unknown[] };

    expect(Array.isArray(parsed.events)).toBe(true);
    expect(parsed.events.length).toBe(2);

    for (const event of parsed.events) {
      const result = eventSchema.safeParse(event);
      expect(result.success).toBe(true);
    }
  });

  it('mixed batch: exactly two events pass and one fails', () => {
    const raw = readFileSync(resolve(fixturesDir, 'batch-mixed.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { events: unknown[] };

    expect(Array.isArray(parsed.events)).toBe(true);
    expect(parsed.events.length).toBe(3);

    const results = parsed.events.map((e) => eventSchema.safeParse(e).success);
    const passed = results.filter((s) => s === true).length;
    const failed = results.filter((s) => s === false).length;

    expect(passed).toBe(2);
    expect(failed).toBe(1);
    expect(results).toEqual([true, true, false]);
  });

  it('all API fixtures are valid JSON', () => {
    const files = readdirSync(apiFixturesDir).filter((f) =>
      f.endsWith('.json'),
    );
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const filePath = resolve(apiFixturesDir, file);
      const content = readFileSync(filePath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    }
  });
});
