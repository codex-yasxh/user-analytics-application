import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { bucketOf } from '../packages/shared/src/bucket-of.js';
import { normalizePath } from '../packages/shared/src/normalize-path.js';

interface HotspotRect {
  selector: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PageCapture {
  doc_w: number;
  doc_h: number;
  hotspots: HotspotRect[];
}

const VIEWPORT_DEFAULTS: Record<string, { vw: number; vh: number }> = {
  desktop: { vw: 1280, vh: 800 },
  tablet: { vw: 768, vh: 1024 },
  mobile: { vw: 390, vh: 844 },
};

const FALLBACK: Record<string, Record<string, PageCapture>> = {
  desktop: {
    home: {
      doc_w: 1280,
      doc_h: 800,
      hotspots: [
        { selector: 'a.nav-products', x: 1021, y: 30, w: 61, h: 20 },
        { selector: 'button.add-to-cart', x: 263, y: 624, w: 295, h: 36 },
        { selector: 'button.add-to-cart', x: 640, y: 624, w: 295, h: 36 },
        { selector: 'button.add-to-cart', x: 1017, y: 624, w: 295, h: 36 },
      ],
    },
    product: {
      doc_w: 1280,
      doc_h: 800,
      hotspots: [
        { selector: 'a.nav-products', x: 1021, y: 30, w: 61, h: 20 },
        { selector: 'button.add-to-cart', x: 734, y: 469, w: 139, h: 46 },
        { selector: 'button.buy-now', x: 879, y: 469, w: 120, h: 46 },
        { selector: 'button.quick-view', x: 760, y: 525, w: 192, h: 34 },
      ],
    },
    checkout: {
      doc_w: 1280,
      doc_h: 800,
      hotspots: [
        { selector: 'input#name', x: 428, y: 264, w: 376, h: 38 },
        { selector: 'button.place-order', x: 428, y: 573, w: 376, h: 42 },
      ],
    },
  },
  tablet: {
    home: {
      doc_w: 768,
      doc_h: 1024,
      hotspots: [
        { selector: 'a.nav-products', x: 509, y: 30, w: 61, h: 20 },
        { selector: 'button.add-to-cart', x: 200, y: 624, w: 286, h: 36 },
        { selector: 'button.add-to-cart', x: 568, y: 624, w: 286, h: 36 },
      ],
    },
    product: {
      doc_w: 768,
      doc_h: 1024,
      hotspots: [
        { selector: 'a.nav-products', x: 509, y: 30, w: 61, h: 20 },
        { selector: 'button.add-to-cart', x: 94, y: 897, w: 139, h: 46 },
        { selector: 'button.buy-now', x: 239, y: 897, w: 120, h: 46 },
      ],
    },
    checkout: {
      doc_w: 768,
      doc_h: 1024,
      hotspots: [
        { selector: 'button.place-order', x: 384, y: 555, w: 720, h: 42 },
      ],
    },
  },
  mobile: {
    home: {
      doc_w: 390,
      doc_h: 844,
      hotspots: [
        { selector: 'a.nav-products', x: 261, y: 33, w: 61, h: 20 },
        { selector: 'button.add-to-cart', x: 195, y: 728, w: 276, h: 36 },
      ],
    },
    product: {
      doc_w: 390,
      doc_h: 844,
      hotspots: [
        { selector: 'button.add-to-cart', x: 94, y: 993, w: 139, h: 46 },
        { selector: 'button.buy-now', x: 239, y: 993, w: 120, h: 46 },
      ],
    },
    checkout: {
      doc_w: 390,
      doc_h: 844,
      hotspots: [
        { selector: 'button.place-order', x: 195, y: 600, w: 342, h: 42 },
      ],
    },
  },
};

function loadHotspots(): Record<string, Record<string, PageCapture>> {
  const jsonPath = path.resolve(process.cwd(), 'scripts', 'hotspots.json');
  try {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;
    const first = Object.values(Object.values(parsed)[0])[0];
    if (first && typeof first === 'object' && 'doc_w' in first) {
      return parsed as Record<string, Record<string, PageCapture>>;
    }
    // Old format (array of rects without page dims) — wrap with viewport defaults
    const legacy = parsed as Record<string, Record<string, HotspotRect[]>>;
    const result: Record<string, Record<string, PageCapture>> = {};
    for (const [bucket, pages] of Object.entries(legacy)) {
      result[bucket] = {};
      const vp = VIEWPORT_DEFAULTS[bucket] ?? { vw: 1280, vh: 800 };
      for (const [page, rects] of Object.entries(pages)) {
        result[bucket][page] = { doc_w: vp.vw, doc_h: vp.vh, hotspots: rects };
      }
    }
    return result;
  } catch {
    return FALLBACK;
  }
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export async function seedDatabase(
  options: {
    mongoUrl?: string;
    demoOrigin?: string;
    sessionCount?: number;
  } = {},
): Promise<{ sessionsCount: number; eventsCount: number }> {
  const mongoUrl =
    options.mongoUrl || process.env.MONGO_URL || 'mongodb://localhost:27017/cf';
  const demoOrigin = (
    options.demoOrigin ||
    process.env.DEMO_ORIGIN ||
    'http://localhost:5173'
  ).replace(/\/$/, '');
  const sessionCount = options.sessionCount || 30;
  const HOTSPOTS = loadHotspots();

  const client = new MongoClient(mongoUrl);
  await client.connect();

  const db = client.db();
  const collection = db.collection('events');

  await collection.deleteMany({ src: 'seed' });

  const homeUrl = `${demoOrigin}/demo/home.html`;
  const productUrl = `${demoOrigin}/demo/product.html`;
  const checkoutUrl = `${demoOrigin}/demo/checkout.html`;

  const paths = {
    home: normalizePath(homeUrl),
    product: normalizePath(productUrl),
    checkout: normalizePath(checkoutUrl),
  };

  interface SeedEventDoc {
    eid: string;
    session_id: string;
    type: 'page_view' | 'click';
    url: string;
    path: string;
    ts: Date;
    received_at: Date;
    src: 'seed';
    vw: number;
    vh: number;
    vw_bucket: string;
    x?: number;
    y?: number;
    doc_w?: number;
    doc_h?: number;
    sel?: string;
  }

  const now = Date.now();
  const PROJECT_START = new Date('2026-10-12T00:00:00Z').getTime();
  const windowMs = now - PROJECT_START;
  const allEvents: SeedEventDoc[] = [];

  function addClick(
    sessionId: string,
    currentTime: number,
    url: string,
    pagePath: string,
    bucket: string,
    pageName: string,
  ): number {
    const vp = VIEWPORT_DEFAULTS[bucket];
    const pageCapture = HOTSPOTS[bucket]?.[pageName];
    if (!pageCapture || pageCapture.hotspots.length === 0) return currentTime;

    const target =
      pageCapture.hotspots[
        Math.floor(Math.random() * pageCapture.hotspots.length)
      ];
    const x = Math.round(target.x + randomBetween(-target.w / 3, target.w / 3));
    const y = Math.round(target.y + randomBetween(-target.h / 3, target.h / 3));

    allEvents.push({
      eid: crypto.randomUUID(),
      session_id: sessionId,
      type: 'click',
      url,
      path: pagePath,
      ts: new Date(currentTime),
      received_at: new Date(currentTime + 50),
      src: 'seed',
      vw: vp.vw,
      vh: vp.vh,
      vw_bucket: bucketOf(vp.vw),
      x,
      y,
      doc_w: pageCapture.doc_w,
      doc_h: pageCapture.doc_h,
      sel: target.selector,
    });

    return currentTime + Math.floor(randomBetween(1500, 5000));
  }

  for (let s = 0; s < sessionCount; s++) {
    const sessionId = crypto.randomUUID();
    const sessionStartTime =
      PROJECT_START + Math.floor(Math.random() * windowMs);
    let currentTime = sessionStartTime;

    const rand = Math.random();
    const bucket = rand < 0.6 ? 'desktop' : rand < 0.85 ? 'tablet' : 'mobile';
    const vp = VIEWPORT_DEFAULTS[bucket];

    // Page 1: Home
    allEvents.push({
      eid: crypto.randomUUID(),
      session_id: sessionId,
      type: 'page_view',
      url: homeUrl,
      path: paths.home,
      ts: new Date(currentTime),
      received_at: new Date(currentTime + 50),
      src: 'seed',
      vw: vp.vw,
      vh: vp.vh,
      vw_bucket: bucketOf(vp.vw),
    });

    currentTime += Math.floor(randomBetween(2000, 8000));

    const homeClickCount = Math.floor(randomBetween(1, 3));
    for (let c = 0; c < homeClickCount; c++) {
      currentTime = addClick(
        sessionId,
        currentTime,
        homeUrl,
        paths.home,
        bucket,
        'home',
      );
    }

    // 70% proceed to product
    if (Math.random() < 0.7) {
      allEvents.push({
        eid: crypto.randomUUID(),
        session_id: sessionId,
        type: 'page_view',
        url: productUrl,
        path: paths.product,
        ts: new Date(currentTime),
        received_at: new Date(currentTime + 50),
        src: 'seed',
        vw: vp.vw,
        vh: vp.vh,
        vw_bucket: bucketOf(vp.vw),
      });

      currentTime += Math.floor(randomBetween(3000, 10000));

      const productClickCount = Math.floor(randomBetween(1, 3));
      for (let c = 0; c < productClickCount; c++) {
        currentTime = addClick(
          sessionId,
          currentTime,
          productUrl,
          paths.product,
          bucket,
          'product',
        );
      }

      // 40% proceed to checkout
      if (Math.random() < 0.4) {
        allEvents.push({
          eid: crypto.randomUUID(),
          session_id: sessionId,
          type: 'page_view',
          url: checkoutUrl,
          path: paths.checkout,
          ts: new Date(currentTime),
          received_at: new Date(currentTime + 50),
          src: 'seed',
          vw: vp.vw,
          vh: vp.vh,
          vw_bucket: bucketOf(vp.vw),
        });

        currentTime += Math.floor(randomBetween(4000, 12000));

        currentTime = addClick(
          sessionId,
          currentTime,
          checkoutUrl,
          paths.checkout,
          bucket,
          'checkout',
        );
      }
    }
  }

  if (allEvents.length > 0) {
    await collection.insertMany(allEvents, { ordered: false });
  }

  await client.close();

  return { sessionsCount: sessionCount, eventsCount: allEvents.length };
}

if (
  process.argv[1]?.endsWith('seed.ts') ||
  process.argv[1]?.endsWith('seed.js')
) {
  seedDatabase()
    .then(({ sessionsCount, eventsCount }) => {
      process.stdout.write(
        `Successfully seeded ${sessionsCount} sessions (${eventsCount} events) with src: "seed"\n`,
      );
      process.exit(0);
    })
    .catch((err) => {
      process.stderr.write(`Seeding failed: ${err}\n`);
      process.exit(1);
    });
}
