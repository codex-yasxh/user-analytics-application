import { test, expect } from '@playwright/test';
import { startE2e, type E2eInstance } from './e2e-helper.js';

let instance: E2eInstance;

test.beforeAll(async () => {
  instance = await startE2e();
});

test.afterAll(async () => {
  if (instance) await instance.cleanup();
});

// Click a known button, wait for the event to reach Mongo, then read the
// heatmap point back and verify it falls inside the button's bounding rect
// at the reference width (1280px desktop).
test('click point lands inside the target button rectangle', async ({
  page,
}) => {
  const demoUrl = `${instance.staticUrl}/demo/home.html`;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(demoUrl);

  // Wait for tracker init
  await page.waitForFunction(() => window.__cf !== undefined, null, {
    timeout: 5000,
  });

  // Find the first Add to Cart button and get its bounding rect
  const button = page.locator('button.add-to-cart').first();
  const box = await button.boundingBox();
  expect(box).toBeTruthy();

  // Click the button
  await button.click();

  // Wait for the flush interval (3s) plus a buffer
  await page.waitForTimeout(4000);

  // Navigate away to trigger pagehide flush
  await page.goto('about:blank');

  // Poll Mongo for the click event
  let clickEvent: Record<string, unknown> | null = null;
  for (let i = 0; i < 10; i++) {
    clickEvent = (await instance.db
      .collection('events')
      .findOne({ type: 'click' })) as Record<string, unknown> | null;
    if (clickEvent) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  expect(clickEvent).toBeTruthy();

  // The stored coordinates are pageX/pageY at the actual viewport width.
  // At 1280px viewport (matching the desktop reference width), the scale
  // factor is 1.0, so stored x/y should match the button's bounding rect.
  const x = clickEvent!.x as number;
  const y = clickEvent!.y as number;

  // Verify the point is inside (or very close to) the button's bounding rect.
  // Allow a small margin for sub-pixel rounding.
  const margin = 5;
  expect(x).toBeGreaterThanOrEqual(box!.x - margin);
  expect(x).toBeLessThanOrEqual(box!.x + box!.width + margin);
  expect(y).toBeGreaterThanOrEqual(box!.y - margin);
  expect(y).toBeLessThanOrEqual(box!.y + box!.height + margin);
});
