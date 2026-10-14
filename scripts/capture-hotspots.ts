import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

interface HotspotRect {
  selector: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

type HotspotsMap = Record<string, Record<string, HotspotRect[]>>;

const WIDTHS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

const PAGES: Record<string, { file: string; selectors: string[] }> = {
  home: {
    file: 'home.html',
    selectors: ['a.nav-products', 'button.add-to-cart'],
  },
  product: {
    file: 'product.html',
    selectors: [
      'a.nav-products',
      'button.add-to-cart',
      'button.buy-now',
      'button.quick-view',
    ],
  },
  checkout: {
    file: 'checkout.html',
    selectors: ['input#name', 'button.place-order'],
  },
};

async function captureHotspots(): Promise<void> {
  const demoDir = path.resolve(process.cwd(), 'demo');
  const outPath = path.resolve(process.cwd(), 'scripts', 'hotspots.json');

  const browser = await chromium.launch({ headless: true });
  const hotspots: HotspotsMap = {};

  for (const vp of WIDTHS) {
    hotspots[vp.name] = {};
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    for (const [pageName, pageConf] of Object.entries(PAGES)) {
      const filePath = path.join(demoDir, pageConf.file);
      await page.goto(`file://${filePath.replace(/\\/g, '/')}?cf_ignore`);
      await page.waitForLoadState('domcontentloaded');

      const rects: HotspotRect[] = [];

      for (const sel of pageConf.selectors) {
        const elements = page.locator(sel);
        const count = await elements.count();

        for (let i = 0; i < count; i++) {
          const box = await elements.nth(i).boundingBox();
          if (box) {
            rects.push({
              selector: sel,
              x: Math.round(box.x + box.width / 2),
              y: Math.round(box.y + box.height / 2),
              w: Math.round(box.width),
              h: Math.round(box.height),
            });
          }
        }
      }

      hotspots[vp.name][pageName] = rects;
    }

    await context.close();
  }

  await browser.close();

  fs.writeFileSync(outPath, JSON.stringify(hotspots, null, 2) + '\n');
  process.stdout.write(`Wrote ${outPath}\n`);
}

captureHotspots().catch((err) => {
  process.stderr.write(`capture-hotspots failed: ${err}\n`);
  process.exit(1);
});
