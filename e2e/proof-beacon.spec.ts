import { test, expect } from '@playwright/test';
import { startE2e, type E2eInstance } from './e2e-helper.js';

let instance: E2eInstance;

test.beforeAll(async () => {
  instance = await startE2e();
});

test.afterAll(async () => {
  if (instance) await instance.cleanup();
});

// A real navigation triggers pagehide, which flushes queued events to the API.
// We navigate to the demo, interact, then navigate away, and poll Mongo to
// verify the events arrived. This is intentionally flaky-aware: sendBeacon is
// best-effort, and the browser may drop the request on fast navigations.
test('pagehide flush delivers events to Mongo', async ({ page }) => {
  await page.goto(`${instance.staticUrl}/demo/home.html`);

  // Wait for the tracker to initialize
  await page.waitForFunction(() => window.__cf !== undefined, null, {
    timeout: 5000,
  });

  // Click a few elements to generate events
  await page.click('text=Shop Now');
  await page.waitForTimeout(500);

  // Navigate away to trigger pagehide flush
  await page.goto('about:blank');

  // Poll Mongo for up to 5 seconds to verify events arrived
  let eventCount = 0;
  for (let i = 0; i < 10; i++) {
    eventCount = await instance.db.collection('events').countDocuments();
    if (eventCount > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  expect(eventCount).toBeGreaterThan(0);
});
